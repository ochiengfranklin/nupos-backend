import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import { products, inventoryMovements } from '../db/schema'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import { AdjustStockInput, StockTakeInput } from '../validators/inventory.validator'

export class InventoryService {

    // Get all inventory movements for a shop
    async getMovements(shopId: string, productId?: string) {
        const conditions = [eq(inventoryMovements.shopId, shopId)]
        if (productId) conditions.push(eq(inventoryMovements.productId, productId))

        return db
            .select({
                id:          inventoryMovements.id,
                type:        inventoryMovements.type,
                quantity:    inventoryMovements.quantity,
                stockBefore: inventoryMovements.stockBefore,
                stockAfter:  inventoryMovements.stockAfter,
                reason:      inventoryMovements.reason,
                createdAt:   inventoryMovements.createdAt,
                product: {
                    id:   products.id,
                    name: products.name,
                    sku:  products.sku,
                },
            })
            .from(inventoryMovements)
            .leftJoin(products, eq(inventoryMovements.productId, products.id))
            .where(and(...conditions))
            .orderBy(desc(inventoryMovements.createdAt))
            .limit(100)
    }

    // Adjust stock for a single product
    async adjustStock(shopId: string, userId: string, input: AdjustStockInput) {
        // Fetch current stock
        const [product] = await db
            .select({
                id:            products.id,
                name:          products.name,
                stockQuantity: products.stockQuantity,
            })
            .from(products)
            .where(and(
                eq(products.id, input.productId),
                eq(products.shopId, shopId),
                eq(products.isActive, true),
            ))
            .limit(1)

        if (!product) {
            throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND)
        }

        const stockBefore = product.stockQuantity

        // Calculate new stock based on type
        let stockAfter: number
        let movementQuantity: number

        if (input.type === 'RESTOCK' || input.type === 'RETURN') {
            // Adding stock
            stockAfter       = stockBefore + input.quantity
            movementQuantity = input.quantity
        } else if (input.type === 'DAMAGE' || input.type === 'ADJUSTMENT') {
            // Removing stock
            if (input.quantity > stockBefore) {
                throw new AppError(
                    `Cannot remove ${input.quantity} units. Only ${stockBefore} in stock.`,
                    HTTP_STATUS.BAD_REQUEST
                )
            }
            stockAfter       = stockBefore - input.quantity
            movementQuantity = -input.quantity
        } else {
            throw new AppError('Invalid movement type', HTTP_STATUS.BAD_REQUEST)
        }

        // Update stock
        await db
            .update(products)
            .set({ stockQuantity: stockAfter, updatedAt: new Date() })
            .where(and(
                eq(products.id, input.productId),
                eq(products.shopId, shopId)
            ))

        // Log movement
        await db.insert(inventoryMovements).values({
            shopId,
            productId:   input.productId,
            userId,
            type:        input.type,
            quantity:    movementQuantity,
            stockBefore,
            stockAfter,
            reason:      input.reason,
        })

        return {
            product:     product.name,
            stockBefore,
            stockAfter,
            type:        input.type,
            quantity:    input.quantity,
        }
    }

    //Stock take — set exact quantities for multiple products
    // Used during a full stock count
    async stockTake(shopId: string, userId: string, input: StockTakeInput) {
        const results = []

        for (const item of input.items) {
            const [product] = await db
                .select({
                    id:            products.id,
                    name:          products.name,
                    stockQuantity: products.stockQuantity,
                })
                .from(products)
                .where(and(
                    eq(products.id, item.productId),
                    eq(products.shopId, shopId),
                    eq(products.isActive, true),
                ))
                .limit(1)

            if (!product) continue

            const stockBefore    = product.stockQuantity
            const stockAfter     = item.actualQuantity
            const movementQty    = stockAfter - stockBefore

            if (movementQty === 0) continue

            await db
                .update(products)
                .set({ stockQuantity: stockAfter, updatedAt: new Date() })
                .where(and(
                    eq(products.id, item.productId),
                    eq(products.shopId, shopId)
                ))

            await db.insert(inventoryMovements).values({
                shopId,
                productId:   item.productId,
                userId,
                type:        'ADJUSTMENT',
                quantity:    movementQty,
                stockBefore,
                stockAfter,
                reason:      item.reason || 'Stock take',
            })

            results.push({
                product:     product.name,
                stockBefore,
                stockAfter,
                difference:  movementQty,
            })
        }

        return results
    }

    // Get low stock products
    async getLowStock(shopId: string) {
        return db
            .select({
                id:                products.id,
                name:              products.name,
                sku:               products.sku,
                stockQuantity:     products.stockQuantity,
                lowStockThreshold: products.lowStockThreshold,
            })
            .from(products)
            .where(and(
                eq(products.shopId, shopId),
                eq(products.isActive, true),
                sql`${products.stockQuantity} <= ${products.lowStockThreshold}`,
            ))
            .orderBy(products.stockQuantity)
    }
}

export const inventoryService = new InventoryService()