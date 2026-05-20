import { Response, NextFunction } from 'express'
import { shopService } from '../services/shop.service'
import { sendSuccess } from '../utils/response'
import { AuthenticatedRequest } from '../types'
import { updateShopSchema } from '../validators/shop.validator'

export class ShopController {

    async getShop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await shopService.getShop(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) { next(error) }
    }

    async updateShop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = updateShopSchema.parse(req.body)
            const data  = await shopService.updateShop(req.user!.shopId, input)
            sendSuccess(res, { message: 'Shop settings updated', data })
        } catch (error) { next(error) }
    }
}

export const shopController = new ShopController()