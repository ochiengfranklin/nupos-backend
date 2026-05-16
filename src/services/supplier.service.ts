import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import {
    suppliers,
    purchaseOrders,
    purchaseOrderItems,
    products,
    inventoryMovements,
    users,
} from '../db/schema'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import {
    CreateSupplierInput,
    UpdateSupplierInput,
    CreatePurchaseOrderInput,
    ReceivePurchaseOrderInput,
} from '../validators/supplier.validator'

// Generate PO number
const generatePONumber = (): string => {
    const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `PO-${date}-${random}`
}

export class SupplierService {

    //  Suppliers
    async getAllSuppliers(shopId: string) {
        return db
            .select()
            .from(suppliers)
            .where(and(
                eq(suppliers.shopId, shopId),
                eq(suppliers.isActive, true),
            ))
            .orderBy(suppliers.name)
    }

    async getSupplierById(id: string, shopId: string) {
        const [supplier] = await db
            .select()
            .from(suppliers)
            .where(and(
                eq(suppliers.id, id),
                eq(suppliers.shopId, shopId),
            ))
            .limit(1)

        if (!supplier) throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND)
        return supplier
    }

    async createSupplier(shopId: string, input: CreateSupplierInput) {
        const [supplier] = await db
            .insert(suppliers)
            .values({ shopId, ...input })
            .returning()
        return supplier
    }

    async updateSupplier(id: string, shopId: string, input: UpdateSupplierInput) {
        await this.getSupplierById(id, shopId)
        const [updated] = await db
            .update(suppliers)
            .set({ ...input, updatedAt: new Date() })
            .where(and(eq(suppliers.id, id), eq(suppliers.shopId, shopId)))
            .returning()
        return updated
    }

    async deleteSupplier(id: string, shopId: string) {
        await this.getSupplierById(id, shopId)
        await db
            .update(suppliers)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(suppliers.id, id), eq(suppliers.shopId, shopId)))
    }

    // Purchase orders
    async getAllPurchaseOrders(shopId: string) {
        const orders = await db
            .select({
                id:          purchaseOrders.id,
                orderNumber: purchaseOrders.orderNumber,
                status:      purchaseOrders.status,
                totalAmount: purchaseOrders.totalAmount,
                notes:       purchaseOrders.notes,
                orderedAt:   purchaseOrders.orderedAt,
                receivedAt:  purchaseOrders.receivedAt,
                createdAt:   purchaseOrders.createdAt,
                supplier: {
                    id:   suppliers.id,
                    name: suppliers.name,
                },
            })
            .from(purchaseOrders)
            .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
            .where(eq(purchaseOrders.shopId, shopId))
            .orderBy(desc(purchaseOrders.createdAt))

        return orders
    }

    async getPurchaseOrderById(id: string, shopId: string) {
        const [order] = await db
            .select({
                id:          purchaseOrders.id,
                orderNumber: purchaseOrders.orderNumber,
                status:      purchaseOrders.status,
                totalAmount: purchaseOrders.totalAmount,
                notes:       purchaseOrders.notes,
                orderedAt:   purchaseOrders.orderedAt,
                receivedAt:  purchaseOrders.receivedAt,
                createdAt:   purchaseOrders.createdAt,
                supplier: {
                    id:    suppliers.id,
                    name:  suppliers.name,
                    phone: suppliers.phone,
                },
            })
            .from(purchaseOrders)
            .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
            .where(and(
                eq(purchaseOrders.id, id),
                eq(purchaseOrders.shopId, shopId),
            ))
            .limit(1)

        if (!order) throw new AppError('Purchase order not found', HTTP_STATUS.NOT_FOUND)

        const items = await db
            .select({
                id:          purchaseOrderItems.id,
                quantity:    purchaseOrderItems.quantity,
                unitCost:    purchaseOrderItems.unitCost,
                totalCost:   purchaseOrderItems.totalCost,
                receivedQty: purchaseOrderItems.receivedQty,
                product: {
                    id:   products.id,
                    name: products.name,
                    sku:  products.sku,
                },
            })
            .from(purchaseOrderItems)
            .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
            .where(eq(purchaseOrderItems.purchaseOrderId, id))

        return { ...order, items }
    }

    async createPurchaseOrder(shopId: string, userId: string, input: CreatePurchaseOrderInput) {
        const orderNumber = generatePONumber()

        // Calculate total
        const totalAmount = input.items.reduce(
            (sum, item) => sum + item.quantity * item.unitCost, 0
        )

        const [order] = await db
            .insert(purchaseOrders)
            .values({
                shopId,
                supplierId:  input.supplierId,
                orderNumber,
                status:      'DRAFT',
                totalAmount: totalAmount.toFixed(2),
                notes:       input.notes,
                createdBy:   userId,
            })
            .returning()

        await db.insert(purchaseOrderItems).values(
            input.items.map(item => ({
                purchaseOrderId: order.id,
                productId:       item.productId,
                quantity:        item.quantity,
                unitCost:        String(item.unitCost),
                totalCost:       String(item.quantity * item.unitCost),
                receivedQty:     0,
            }))
        )

        return this.getPurchaseOrderById(order.id, shopId)
    }

    async markAsOrdered(id: string, shopId: string) {
        const order = await this.getPurchaseOrderById(id, shopId)
        if (order.status !== 'DRAFT') {
            throw new AppError('Only draft orders can be marked as ordered', HTTP_STATUS.BAD_REQUEST)
        }
        await db
            .update(purchaseOrders)
            .set({ status: 'ORDERED', orderedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.shopId, shopId)))
        return this.getPurchaseOrderById(id, shopId)
    }

    async receivePurchaseOrder(id: string, shopId: string, userId: string, input: ReceivePurchaseOrderInput) {
        const order = await this.getPurchaseOrderById(id, shopId)

        if (!['ORDERED', 'DRAFT'].includes(order.status)) {
            throw new AppError('This order cannot be received', HTTP_STATUS.BAD_REQUEST)
        }

        // Process each received item
        for (const receivedItem of input.items) {
            if (receivedItem.receivedQty <= 0) continue

            // Get the purchase order item
            const poItem = order.items.find(i => i.id === receivedItem.purchaseOrderItemId)
            if (!poItem || !poItem.product) continue

            // Update received qty on PO item
            await db
                .update(purchaseOrderItems)
                .set({ receivedQty: receivedItem.receivedQty })
                .where(eq(purchaseOrderItems.id, receivedItem.purchaseOrderItemId))

            // Get current stock
            const [product] = await db
                .select({ stockQuantity: products.stockQuantity })
                .from(products)
                .where(eq(products.id, poItem.product.id))
                .limit(1)

            if (!product) continue

            const stockBefore = product.stockQuantity
            const stockAfter  = stockBefore + receivedItem.receivedQty

            // Update product stock
            await db
                .update(products)
                .set({
                    stockQuantity: stockAfter,
                    costPrice:     poItem.unitCost,
                    updatedAt:     new Date(),
                })
                .where(eq(products.id, poItem.product.id))

            // Log inventory movement
            await db.insert(inventoryMovements).values({
                shopId,
                productId:   poItem.product.id,
                userId,
                type:        'RESTOCK',
                quantity:    receivedItem.receivedQty,
                stockBefore,
                stockAfter,
                reason:      `Purchase order ${order.orderNumber}`,
                referenceId: id,
            })
        }

        // Mark order as received
        await db
            .update(purchaseOrders)
            .set({
                status:     'RECEIVED',
                receivedAt: new Date(),
                notes:      input.notes || order.notes,
                updatedAt:  new Date(),
            })
            .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.shopId, shopId)))

        return this.getPurchaseOrderById(id, shopId)
    }

    async cancelPurchaseOrder(id: string, shopId: string) {
        const order = await this.getPurchaseOrderById(id, shopId)
        if (order.status === 'RECEIVED') {
            throw new AppError('Received orders cannot be cancelled', HTTP_STATUS.BAD_REQUEST)
        }
        await db
            .update(purchaseOrders)
            .set({ status: 'CANCELLED', updatedAt: new Date() })
            .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.shopId, shopId)))
    }
}

export const supplierService = new SupplierService()