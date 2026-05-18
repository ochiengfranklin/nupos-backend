import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import {
    loyaltyTransactions,
    loyaltySettings,
    customers,
    sales,
} from '../db/schema'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'

export class LoyaltyService {

    // Get or create loyalty settings for a shop
    async getSettings(shopId: string) {
        const [settings] = await db
            .select()
            .from(loyaltySettings)
            .where(eq(loyaltySettings.shopId, shopId))
            .limit(1)

        if (settings) return settings

        // Create default settings
        const [created] = await db
            .insert(loyaltySettings)
            .values({ shopId })
            .returning()

        return created
    }

    //  Update loyalty settings
    async updateSettings(shopId: string, input: {
        isEnabled?:            boolean
        pointsPerHundred?:     number
        pointsRedemptionRate?: number
        minimumRedemption?:    number
    }) {
        const existing = await this.getSettings(shopId)

        const [updated] = await db
            .update(loyaltySettings)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(loyaltySettings.id, existing.id))
            .returning()

        return updated
    }

    // Calculate points earned for a sale amount
    async calculatePoints(shopId: string, amount: number): Promise<number> {
        const settings = await this.getSettings(shopId)
        if (!settings.isEnabled) return 0
        return Math.floor((amount / 100) * settings.pointsPerHundred)
    }

    // Calculate discount value for points
    async calculateDiscount(shopId: string, points: number): Promise<number> {
        const settings = await this.getSettings(shopId)
        if (!settings.isEnabled) return 0
        if (points < settings.minimumRedemption) return 0
        return points * settings.pointsRedemptionRate
    }

    //  Award points after a sale
    async awardPoints(shopId: string, customerId: string, saleId: string, amount: number) {
        const points = await this.calculatePoints(shopId, amount)
        if (points === 0) return

        const [customer] = await db
            .select({ loyaltyPoints: customers.loyaltyPoints })
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1)

        if (!customer) return

        const balanceBefore = customer.loyaltyPoints
        const balanceAfter  = balanceBefore + points

        await db
            .update(customers)
            .set({ loyaltyPoints: balanceAfter })
            .where(eq(customers.id, customerId))

        await db.insert(loyaltyTransactions).values({
            shopId,
            customerId,
            saleId,
            type:         'EARNED',
            points,
            balanceBefore,
            balanceAfter,
            note:         `Earned from sale`,
        })

        return { points, balanceAfter }
    }

    // Redeem points at checkout
    async redeemPoints(shopId: string, customerId: string, points: number, saleId?: string) {
        const settings = await this.getSettings(shopId)

        if (!settings.isEnabled) {
            throw new AppError('Loyalty program is not enabled', HTTP_STATUS.BAD_REQUEST)
        }

        if (points < settings.minimumRedemption) {
            throw new AppError(
                `Minimum redemption is ${settings.minimumRedemption} points`,
                HTTP_STATUS.BAD_REQUEST
            )
        }

        const [customer] = await db
            .select({ loyaltyPoints: customers.loyaltyPoints })
            .from(customers)
            .where(and(
                eq(customers.id, customerId),
                eq(customers.shopId, shopId),
            ))
            .limit(1)

        if (!customer) {
            throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND)
        }

        if (customer.loyaltyPoints < points) {
            throw new AppError(
                `Insufficient points. Customer has ${customer.loyaltyPoints} points.`,
                HTTP_STATUS.BAD_REQUEST
            )
        }

        const discount      = await this.calculateDiscount(shopId, points)
        const balanceBefore = customer.loyaltyPoints
        const balanceAfter  = balanceBefore - points

        await db
            .update(customers)
            .set({ loyaltyPoints: balanceAfter })
            .where(eq(customers.id, customerId))

        await db.insert(loyaltyTransactions).values({
            shopId,
            customerId,
            saleId:       saleId || null,
            type:         'REDEEMED',
            points:       -points,
            balanceBefore,
            balanceAfter,
            note:         `Redeemed for KES ${discount} discount`,
        })

        return { points, discount, balanceAfter }
    }

    // Manually adjust points
    async adjustPoints(shopId: string, customerId: string, points: number, note: string) {
        const [customer] = await db
            .select({ loyaltyPoints: customers.loyaltyPoints })
            .from(customers)
            .where(and(
                eq(customers.id, customerId),
                eq(customers.shopId, shopId),
            ))
            .limit(1)

        if (!customer) throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND)

        const balanceBefore = customer.loyaltyPoints
        const balanceAfter  = Math.max(0, balanceBefore + points)

        await db
            .update(customers)
            .set({ loyaltyPoints: balanceAfter })
            .where(eq(customers.id, customerId))

        await db.insert(loyaltyTransactions).values({
            shopId,
            customerId,
            type:         'ADJUSTED',
            points:       balanceAfter - balanceBefore,
            balanceBefore,
            balanceAfter,
            note,
        })

        return { balanceBefore, balanceAfter }
    }

    // Get customer loyalty history
    async getCustomerHistory(shopId: string, customerId: string) {
        const [customer] = await db
            .select({
                id:            customers.id,
                name:          customers.name,
                loyaltyPoints: customers.loyaltyPoints,
            })
            .from(customers)
            .where(and(
                eq(customers.id, customerId),
                eq(customers.shopId, shopId),
            ))
            .limit(1)

        if (!customer) throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND)

        const transactions = await db
            .select()
            .from(loyaltyTransactions)
            .where(and(
                eq(loyaltyTransactions.shopId, shopId),
                eq(loyaltyTransactions.customerId, customerId),
            ))
            .orderBy(desc(loyaltyTransactions.createdAt))
            .limit(50)

        return { customer, transactions }
    }
}

export const loyaltyService = new LoyaltyService()