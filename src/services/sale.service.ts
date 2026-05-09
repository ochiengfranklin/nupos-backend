import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import {
    sales,
    saleItems,
    products,
    payments,
    customers,
    inventoryMovements,
    shops,
} from '../db/schema'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import { CreateSaleInput, SaleQueryInput } from '../validators/sale.validator'
import { generateReceiptNumber } from '../utils/receipt'
import { db } from '../db'

export class SaleService {

    // Create sale
    async createSale(shopId: string, cashierId: string, input: CreateSaleInput) {

        // STEP 1: Fetch all products in one query
        const foundProducts = await db
            .select({
                id:            products.id,
                name:          products.name,
                price:         products.price,
                stockQuantity: products.stockQuantity,
                isActive:      products.isActive,
            })
            .from(products)
            .where(and(
                eq(products.shopId, shopId),
                eq(products.isActive, true)
            ))

        const productMap = new Map(foundProducts.map((p) => [p.id, p]))

        // STEP 2: Validate each item
        for (const item of input.items) {
            const product = productMap.get(item.productId)

            if (!product) {
                throw new AppError(
                    `Product ${item.productId} not found or not available`,
                    HTTP_STATUS.NOT_FOUND
                )
            }

            if (product.stockQuantity < item.quantity) {
                throw new AppError(
                    `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
                    HTTP_STATUS.BAD_REQUEST
                )
            }
        }

        // STEP 3: Calculate totals on the server
        let subtotal = 0

        const saleItemsData = input.items.map((item) => {
            const product   = productMap.get(item.productId)!
            const unitPrice = parseFloat(product.price)
            const itemTotal = unitPrice * item.quantity
            subtotal += itemTotal

            return {
                productId: item.productId,
                quantity:  item.quantity,
                unitPrice: product.price,
                subtotal:  itemTotal.toFixed(2),
                name:      product.name,
                stockQuantity: product.stockQuantity,
            }
        })

        const discountAmount = input.discountAmount || 0
        const taxAmount      = 0
        const totalAmount    = Math.max(0, subtotal - discountAmount + taxAmount)

        //  STEP 4: Get shop slug for receipt number
        const [shop] = await db
            .select({ slug: shops.slug })
            .from(shops)
            .where(eq(shops.id, shopId))
            .limit(1)

        const receiptNumber = generateReceiptNumber(shop.slug)

        // STEP 5: Create sale record
        const [sale] = await db
            .insert(sales)
            .values({
                shopId,
                cashierId,
                customerId:     input.customerId,
                receiptNumber,
                subtotal:       subtotal.toFixed(2),
                taxAmount:      taxAmount.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                totalAmount:    totalAmount.toFixed(2),
                status:         'COMPLETED',
                paymentMethod:  input.paymentMethod,
                notes:          input.notes,
            })
            .returning()

        //  STEP 6: Create sale items
        const insertedItems = await db
            .insert(saleItems)
            .values(
                saleItemsData.map((item) => ({
                    saleId:    sale.id,
                    productId: item.productId,
                    quantity:  item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal:  item.subtotal,
                }))
            )
            .returning()

        //  STEP 7: Deduct stock and log inventory movements
        for (const item of saleItemsData) {
            const stockBefore = item.stockQuantity
            const stockAfter  = stockBefore - item.quantity

            await db
                .update(products)
                .set({
                    stockQuantity: stockAfter,
                    updatedAt:     new Date(),
                })
                .where(and(
                    eq(products.id, item.productId),
                    eq(products.shopId, shopId)
                ))

            await db.insert(inventoryMovements).values({
                shopId,
                productId:   item.productId,
                userId:      cashierId,
                type:        'SALE',
                quantity:    -item.quantity,
                stockBefore,
                stockAfter,
                reason:      `Sale ${receiptNumber}`,
                referenceId: sale.id,
            })
        }

        //   STEP 8: Record payment
        await db.insert(payments).values({
            saleId:    sale.id,
            method:    input.paymentMethod,
            amount:    totalAmount.toFixed(2),
            reference: input.paymentReference,
            status:    'COMPLETED',
        })

        //  STEP 9: Update customer total spent
        if (input.customerId) {
            await db
                .update(customers)
                .set({
                    totalSpent: sql`${customers.totalSpent} + ${totalAmount.toFixed(2)}`,
                    updatedAt:  new Date(),
                })
                .where(eq(customers.id, input.customerId))
        }

        return {
            sale,
            items: insertedItems,
            receiptNumber,
            totalAmount,
            subtotal,
            taxAmount,
            discountAmount,
        }
    }

    //  Get all sales
    async getAll(shopId: string, query: SaleQueryInput) {
        const { page, limit, startDate, endDate, cashierId, paymentMethod, status } = query
        const offset = (page - 1) * limit

        const conditions = [eq(sales.shopId, shopId)]

        if (startDate)     conditions.push(gte(sales.createdAt, new Date(startDate)))
        if (endDate)       conditions.push(lte(sales.createdAt, new Date(endDate)))
        if (cashierId)     conditions.push(eq(sales.cashierId, cashierId))
        if (paymentMethod) conditions.push(eq(sales.paymentMethod, paymentMethod))
        if (status)        conditions.push(eq(sales.status, status))

        const whereClause = and(...conditions)

        const [data, countResult] = await Promise.all([
            db
                .select()
                .from(sales)
                .where(whereClause)
                .orderBy(desc(sales.createdAt))
                .limit(limit)
                .offset(offset),

            db
                .select({ count: sql<number>`count(*)` })
                .from(sales)
                .where(whereClause),
        ])

        return {
            data,
            meta: {
                total:      Number(countResult[0].count),
                page,
                limit,
                totalPages: Math.ceil(Number(countResult[0].count) / limit),
            },
        }
    }

    //   Get single sale with items and payments
    async getById(id: string, shopId: string) {
        const [sale] = await db
            .select()
            .from(sales)
            .where(and(
                eq(sales.id, id),
                eq(sales.shopId, shopId)
            ))
            .limit(1)

        if (!sale) {
            throw new AppError('Sale not found', HTTP_STATUS.NOT_FOUND)
        }

        const [items, salePayments] = await Promise.all([
            db
                .select({
                    id:        saleItems.id,
                    quantity:  saleItems.quantity,
                    unitPrice: saleItems.unitPrice,
                    subtotal:  saleItems.subtotal,
                    product: {
                        id:   products.id,
                        name: products.name,
                        sku:  products.sku,
                    },
                })
                .from(saleItems)
                .leftJoin(products, eq(saleItems.productId, products.id))
                .where(eq(saleItems.saleId, id)),

            db
                .select()
                .from(payments)
                .where(eq(payments.saleId, id)),
        ])

        return { ...sale, items, payments: salePayments }
    }

    //   Void a sale
    async voidSale(id: string, shopId: string, userId: string) {
        const sale = await this.getById(id, shopId)

        if (sale.status !== 'COMPLETED') {
            throw new AppError(
                'Only completed sales can be voided',
                HTTP_STATUS.BAD_REQUEST
            )
        }

        await db
            .update(sales)
            .set({ status: 'VOIDED', updatedAt: new Date() })
            .where(eq(sales.id, id))

        for (const item of sale.items) {
            const [product] = await db
                .select({ stockQuantity: products.stockQuantity })
                .from(products)
                .where(eq(products.id, item.product!.id))
                .limit(1)

            const stockBefore = product.stockQuantity
            const stockAfter  = stockBefore + item.quantity

            await db
                .update(products)
                .set({ stockQuantity: stockAfter, updatedAt: new Date() })
                .where(eq(products.id, item.product!.id))

            await db.insert(inventoryMovements).values({
                shopId,
                productId:   item.product!.id,
                userId,
                type:        'RETURN',
                quantity:    item.quantity,
                stockBefore,
                stockAfter,
                reason:      `Void of sale ${sale.receiptNumber}`,
                referenceId: id,
            })
        }
    }
}

export const saleService = new SaleService()