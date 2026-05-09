import { eq, and, gte, lte, desc, sql, sum, count } from 'drizzle-orm'
import { db } from '../db'
import {
    sales,
    saleItems,
    products,
    payments,
    inventoryMovements,
    users,
} from '../db/schema'

export class ReportService {

    // Dashboard summary
    // Everything the owner sees on the main dashboard
    async getDashboardSummary(shopId: string) {
        const today     = new Date()
        const todayStart = new Date(today.setHours(0, 0, 0, 0))
        const todayEnd   = new Date(today.setHours(23, 59, 59, 999))

        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

        // Run all queries in parallel — much faster than sequential
        const [
            todaySales,
            monthSales,
            totalSales,
            lowStockProducts,
            recentSales,
            paymentBreakdown,
        ] = await Promise.all([

            // Today's revenue and sale count
            db
                .select({
                    totalRevenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
                    saleCount:    sql<number>`count(*)`,
                })
                .from(sales)
                .where(and(
                    eq(sales.shopId, shopId),
                    eq(sales.status, 'COMPLETED'),
                    gte(sales.createdAt, todayStart),
                    lte(sales.createdAt, todayEnd),
                )),

            // This month's revenue
            db
                .select({
                    totalRevenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
                    saleCount:    sql<number>`count(*)`,
                })
                .from(sales)
                .where(and(
                    eq(sales.shopId, shopId),
                    eq(sales.status, 'COMPLETED'),
                    gte(sales.createdAt, thisMonthStart),
                )),

            // All time total
            db
                .select({
                    totalRevenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
                    saleCount:    sql<number>`count(*)`,
                })
                .from(sales)
                .where(and(
                    eq(sales.shopId, shopId),
                    eq(sales.status, 'COMPLETED'),
                )),

            // Low stock products
            db
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
                .limit(10),

            // Recent 5 sales
            db
                .select({
                    id:            sales.id,
                    receiptNumber: sales.receiptNumber,
                    totalAmount:   sales.totalAmount,
                    paymentMethod: sales.paymentMethod,
                    status:        sales.status,
                    createdAt:     sales.createdAt,
                    cashier: {
                        id:   users.id,
                        name: users.name,
                    },
                })
                .from(sales)
                .leftJoin(users, eq(sales.cashierId, users.id))
                .where(and(
                    eq(sales.shopId, shopId),
                    eq(sales.status, 'COMPLETED'),
                ))
                .orderBy(desc(sales.createdAt))
                .limit(5),

            // Payment method breakdown for today
            db
                .select({
                    method: sales.paymentMethod,
                    total:  sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
                    count:  sql<number>`count(*)`,
                })
                .from(sales)
                .where(and(
                    eq(sales.shopId, shopId),
                    eq(sales.status, 'COMPLETED'),
                    gte(sales.createdAt, todayStart),
                    lte(sales.createdAt, todayEnd),
                ))
                .groupBy(sales.paymentMethod),
        ])

        return {
            today: {
                revenue:   Number(todaySales[0].totalRevenue),
                saleCount: Number(todaySales[0].saleCount),
            },
            thisMonth: {
                revenue:   Number(monthSales[0].totalRevenue),
                saleCount: Number(monthSales[0].saleCount),
            },
            allTime: {
                revenue:   Number(totalSales[0].totalRevenue),
                saleCount: Number(totalSales[0].saleCount),
            },
            lowStockProducts,
            recentSales,
            paymentBreakdown: paymentBreakdown.map((p) => ({
                method: p.method,
                total:  Number(p.total),
                count:  Number(p.count),
            })),
        }
    }

    //  Sales report — revenue over a date range
    async getSalesReport(shopId: string, startDate: string, endDate: string) {
        const start = new Date(startDate)
        const end   = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        // Daily revenue breakdown
        const dailyRevenue = await db
            .select({
                date:    sql<string>`date(${sales.createdAt})`,
                revenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
                count:   sql<number>`count(*)`,
            })
            .from(sales)
            .where(and(
                eq(sales.shopId, shopId),
                eq(sales.status, 'COMPLETED'),
                gte(sales.createdAt, start),
                lte(sales.createdAt, end),
            ))
            .groupBy(sql`date(${sales.createdAt})`)
            .orderBy(sql`date(${sales.createdAt})`)

        // Summary totals
        const [summary] = await db
            .select({
                totalRevenue:   sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
                totalSales:     sql<number>`count(*)`,
                averageSale:    sql<number>`coalesce(avg(${sales.totalAmount}), 0)`,
                totalDiscount:  sql<number>`coalesce(sum(${sales.discountAmount}), 0)`,
            })
            .from(sales)
            .where(and(
                eq(sales.shopId, shopId),
                eq(sales.status, 'COMPLETED'),
                gte(sales.createdAt, start),
                lte(sales.createdAt, end),
            ))

        // Payment method breakdown
        const paymentBreakdown = await db
            .select({
                method: sales.paymentMethod,
                total:  sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
                count:  sql<number>`count(*)`,
            })
            .from(sales)
            .where(and(
                eq(sales.shopId, shopId),
                eq(sales.status, 'COMPLETED'),
                gte(sales.createdAt, start),
                lte(sales.createdAt, end),
            ))
            .groupBy(sales.paymentMethod)

        return {
            summary: {
                totalRevenue:  Number(summary.totalRevenue),
                totalSales:    Number(summary.totalSales),
                averageSale:   Number(summary.averageSale).toFixed(2),
                totalDiscount: Number(summary.totalDiscount),
            },
            dailyRevenue: dailyRevenue.map((d) => ({
                date:    d.date,
                revenue: Number(d.revenue),
                count:   Number(d.count),
            })),
            paymentBreakdown: paymentBreakdown.map((p) => ({
                method: p.method,
                total:  Number(p.total),
                count:  Number(p.count),
            })),
        }
    }

    //  Top selling products
    async getTopProducts(shopId: string, startDate?: string, endDate?: string, limit = 10) {
        const conditions = [
            eq(sales.shopId, shopId),
            eq(sales.status, 'COMPLETED'),
        ]

        if (startDate) conditions.push(gte(sales.createdAt, new Date(startDate)))
        if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            conditions.push(lte(sales.createdAt, end))
        }

        const topProducts = await db
            .select({
                productId:    saleItems.productId,
                productName:  products.name,
                sku:          products.sku,
                totalQuantity: sql<number>`sum(${saleItems.quantity})`,
                totalRevenue:  sql<number>`sum(${saleItems.subtotal})`,
                saleCount:     sql<number>`count(distinct ${saleItems.saleId})`,
            })
            .from(saleItems)
            .innerJoin(sales,    eq(saleItems.saleId,    sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(and(...conditions))
            .groupBy(saleItems.productId, products.name, products.sku)
            .orderBy(desc(sql`sum(${saleItems.quantity})`))
            .limit(limit)

        return topProducts.map((p) => ({
            productId:     p.productId,
            productName:   p.productName,
            sku:           p.sku,
            totalQuantity: Number(p.totalQuantity),
            totalRevenue:  Number(p.totalRevenue),
            saleCount:     Number(p.saleCount),
        }))
    }

    // Inventory report
    async getInventoryReport(shopId: string) {
        const [
            inventorySummary,
            lowStockItems,
            recentMovements,
        ] = await Promise.all([

            // Total stock value
            db
                .select({
                    totalProducts:   sql<number>`count(*)`,
                    totalStockValue: sql<number>`coalesce(sum(${products.stockQuantity} * ${products.costPrice}::numeric), 0)`,
                    totalRetailValue: sql<number>`coalesce(sum(${products.stockQuantity} * ${products.price}::numeric), 0)`,
                })
                .from(products)
                .where(and(
                    eq(products.shopId, shopId),
                    eq(products.isActive, true),
                )),

            // Low stock items
            db
                .select({
                    id:                products.id,
                    name:              products.name,
                    sku:               products.sku,
                    stockQuantity:     products.stockQuantity,
                    lowStockThreshold: products.lowStockThreshold,
                    price:             products.price,
                })
                .from(products)
                .where(and(
                    eq(products.shopId, shopId),
                    eq(products.isActive, true),
                    sql`${products.stockQuantity} <= ${products.lowStockThreshold}`,
                ))
                .orderBy(products.stockQuantity),

            // Recent inventory movements
            db
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
                    },
                })
                .from(inventoryMovements)
                .leftJoin(products, eq(inventoryMovements.productId, products.id))
                .where(eq(inventoryMovements.shopId, shopId))
                .orderBy(desc(inventoryMovements.createdAt))
                .limit(20),
        ])

        return {
            summary: {
                totalProducts:    Number(inventorySummary[0].totalProducts),
                totalStockValue:  Number(inventorySummary[0].totalStockValue).toFixed(2),
                totalRetailValue: Number(inventorySummary[0].totalRetailValue).toFixed(2),
                potentialProfit:  (
                    Number(inventorySummary[0].totalRetailValue) -
                    Number(inventorySummary[0].totalStockValue)
                ).toFixed(2),
            },
            lowStockItems,
            recentMovements,
        }
    }

    //  Cashier performance report
    async getCashierReport(shopId: string, startDate?: string, endDate?: string) {
        const conditions = [
            eq(sales.shopId, shopId),
            eq(sales.status, 'COMPLETED'),
        ]

        if (startDate) conditions.push(gte(sales.createdAt, new Date(startDate)))
        if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            conditions.push(lte(sales.createdAt, end))
        }

        const cashierStats = await db
            .select({
                cashierId:     sales.cashierId,
                cashierName:   users.name,
                totalRevenue:  sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
                totalSales:    sql<number>`count(*)`,
                averageSale:   sql<number>`coalesce(avg(${sales.totalAmount}), 0)`,
            })
            .from(sales)
            .leftJoin(users, eq(sales.cashierId, users.id))
            .where(and(...conditions))
            .groupBy(sales.cashierId, users.name)
            .orderBy(desc(sql`sum(${sales.totalAmount})`))

        return cashierStats.map((c) => ({
            cashierId:    c.cashierId,
            cashierName:  c.cashierName,
            totalRevenue: Number(c.totalRevenue),
            totalSales:   Number(c.totalSales),
            averageSale:  Number(c.averageSale).toFixed(2),
        }))
    }
}

export const reportService = new ReportService()