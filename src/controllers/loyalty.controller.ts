import { Response, NextFunction } from 'express'
import { loyaltyService } from '../services/loyalty.service'
import { sendSuccess } from '../utils/response'
import { AuthenticatedRequest } from '../types'
import { z } from 'zod'

const updateSettingsSchema = z.object({
    isEnabled:            z.boolean().optional(),
    pointsPerHundred:     z.number().int().min(1).max(1000).optional(),
    pointsRedemptionRate: z.number().int().min(1).max(100).optional(),
    minimumRedemption:    z.number().int().min(1).max(10000).optional(),
})

const adjustPointsSchema = z.object({
    points: z.number().int(),
    note:   z.string().min(1),
})

const redeemPointsSchema = z.object({
    customerId: z.string().uuid(),
    points:     z.number().int().min(1),
})

export class LoyaltyController {

    async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await loyaltyService.getSettings(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) { next(error) }
    }

    async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = updateSettingsSchema.parse(req.body)
            const data  = await loyaltyService.updateSettings(req.user!.shopId, input)
            sendSuccess(res, { message: 'Loyalty settings updated', data })
        } catch (error) { next(error) }
    }

    async getCustomerHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await loyaltyService.getCustomerHistory(
                req.user!.shopId,
                String(req.params.customerId)
            )
            sendSuccess(res, { data })
        } catch (error) { next(error) }
    }

    async adjustPoints(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = adjustPointsSchema.parse(req.body)
            const data  = await loyaltyService.adjustPoints(
                req.user!.shopId,
                String(req.params.customerId),
                input.points,
                input.note,
            )
            sendSuccess(res, { message: 'Points adjusted', data })
        } catch (error) { next(error) }
    }

    async redeemPoints(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = redeemPointsSchema.parse(req.body)
            const data  = await loyaltyService.redeemPoints(
                req.user!.shopId,
                input.customerId,
                input.points,
            )
            sendSuccess(res, { message: `${input.points} points redeemed for KES ${data.discount} discount`, data })
        } catch (error) { next(error) }
    }

    async calculatePoints(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const amount = parseFloat(String(req.query.amount || 0))
            const points = await loyaltyService.calculatePoints(req.user!.shopId, amount)
            const settings = await loyaltyService.getSettings(req.user!.shopId)
            sendSuccess(res, { data: { points, settings } })
        } catch (error) { next(error) }
    }
}

export const loyaltyController = new LoyaltyController()