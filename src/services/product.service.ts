import { eq, and, ilike, sql, lt } from 'drizzle-orm'
import { db } from '../db'
import { products, categories, inventoryMovements } from '../db/schema'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import {
    CreateProductInput,
    UpdateProductInput,
    ProductQueryInput,
} from '../validators/product.validator'

export class ProductService {

    // Get all products with pagination + filters
    async getAll(shopId: string, query: ProductQueryInput) {
        const { page, limit, search, categoryId, lowStock } = query
        const offset = (page - 1) * limit

        // Build conditions array dynamically
        // We always filter by shopId first — tenant isolation
        const conditions = [
            eq(products.shopId, shopId),
            eq(products.isActive, true),
        ]

        if (search) {
            conditions.push(ilike(products.name, `%${search}%`))
        }

        if (categoryId) {
            conditions.push(eq(products.categoryId, categoryId))
        }

        if (lowStock) {
            // Products where stock is at or below the low stock threshold
            conditions.push(
                sql`${products.stockQuantity} <= ${products.lowStockThreshold}`
            )
        }

        const whereClause = and(...conditions)

        // Run count and data queries together for efficiency
        const [data, countResult] = await Promise.all([
            db
                .select({
                    id:                products.id,
                    name:              products.name,
                    description:       products.description,
                    sku:               products.sku,
                    barcode:           products.barcode,
                    price:             products.price,
                    costPrice:         products.costPrice,
                    stockQuantity:     products.stockQuantity,
                    lowStockThreshold: products.lowStockThreshold,
                    isActive:          products.isActive,
                    createdAt:         products.createdAt,
                    category: {
                        id:   categories.id,
                        name: categories.name,
                    },
                })
                .from(products)
                .leftJoin(categories, eq(products.categoryId, categories.id))
                .where(whereClause)
                .orderBy(products.name)
                .limit(limit)
                .offset(offset),

            db
                .select({ count: sql<number>`count(*)` })
                .from(products)
                .where(whereClause),
        ])

        const total = Number(countResult[0].count)

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        }
    }

    // Get single product
    async getById(id: string, shopId: string) {
        const [product] = await db
            .select({
                id:                products.id,
                name:              products.name,
                description:       products.description,
                sku:               products.sku,
                barcode:           products.barcode,
                price:             products.price,
                costPrice:         products.costPrice,
                stockQuantity:     products.stockQuantity,
                lowStockThreshold: products.lowStockThreshold,
                isActive:          products.isActive,
                createdAt:         products.createdAt,
                updatedAt:         products.updatedAt,
                category: {
                    id:   categories.id,
                    name: categories.name,
                },
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(
                eq(products.id, id),
                eq(products.shopId, shopId)
            ))
            .limit(1)

        if (!product) {
            throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND)
        }

        return product
    }

    // Create product
    async create(shopId: string, userId: string, input: CreateProductInput) {
        // If categoryId provided, confirm it belongs to this shop
        if (input.categoryId) {
            const [category] = await db
                .select({ id: categories.id })
                .from(categories)
                .where(and(
                    eq(categories.id, input.categoryId),
                    eq(categories.shopId, shopId)
                ))
                .limit(1)

            if (!category) {
                throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND)
            }
        }

        const [product] = await db
            .insert(products)
            .values({
                shopId,
                name:              input.name,
                description:       input.description,
                sku:               input.sku,
                barcode:           input.barcode,
                price:             String(input.price),
                costPrice:         String(input.costPrice),
                stockQuantity:     input.stockQuantity,
                lowStockThreshold: input.lowStockThreshold,
                categoryId:        input.categoryId,
            })
            .returning()

        // Log the initial stock as an inventory movement
        // This gives us a complete audit trail from day one
        if (input.stockQuantity > 0) {
            await db.insert(inventoryMovements).values({
                shopId,
                productId:   product.id,
                userId,
                type:        'RESTOCK',
                quantity:    input.stockQuantity,
                stockBefore: 0,
                stockAfter:  input.stockQuantity,
                reason:      'Initial stock on product creation',
            })
        }

        return product
    }

    // Update product
    async update(id: string, shopId: string, input: UpdateProductInput) {
        await this.getById(id, shopId)

        // If categoryId is being changed, validate the new category
        if (input.categoryId) {
            const [category] = await db
                .select({ id: categories.id })
                .from(categories)
                .where(and(
                    eq(categories.id, input.categoryId),
                    eq(categories.shopId, shopId)
                ))
                .limit(1)

            if (!category) {
                throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND)
            }
        }

        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
        }

        if (input.name              !== undefined) updateData.name              = input.name
        if (input.description       !== undefined) updateData.description       = input.description
        if (input.sku               !== undefined) updateData.sku               = input.sku
        if (input.barcode           !== undefined) updateData.barcode           = input.barcode
        if (input.price             !== undefined) updateData.price             = String(input.price)
        if (input.costPrice         !== undefined) updateData.costPrice         = String(input.costPrice)
        if (input.lowStockThreshold !== undefined) updateData.lowStockThreshold = input.lowStockThreshold
        if (input.categoryId        !== undefined) updateData.categoryId        = input.categoryId

        const [updated] = await db
            .update(products)
            .set(updateData)
            .where(and(
                eq(products.id, id),
                eq(products.shopId, shopId)
            ))
            .returning()

        return updated
    }

    // Delete product (soft delete)
    async delete(id: string, shopId: string) {
        await this.getById(id, shopId)

        await db
            .update(products)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(
                eq(products.id, id),
                eq(products.shopId, shopId)
            ))
    }
}

export const productService = new ProductService()