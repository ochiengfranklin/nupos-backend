import { Response, NextFunction } from 'express'
import { inventoryService } from '../services/inventory.service'
import { sendSuccess } from '../utils/response'
import { AuthenticatedRequest } from '../types'
import { adjustStockSchema, stockTakeSchema } from '../validators/inventory.validator'

export class InventoryController {

    async getMovements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const productId = req.query.productId ? String(req.query.productId) : undefined
            const data      = await inventoryService.getMovements(req.user!.shopId, productId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input  = adjustStockSchema.parse(req.body)
            const result = await inventoryService.adjustStock(
                req.user!.shopId,
                req.user!.userId,
                input
            )
            sendSuccess(res, { message: 'Stock adjusted successfully', data: result })
        } catch (error) {
            next(error)
        }
    }

    async stockTake(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input  = stockTakeSchema.parse(req.body)
            const result = await inventoryService.stockTake(
                req.user!.shopId,
                req.user!.userId,
                input
            )
            sendSuccess(res, { message: `Stock take complete. ${result.length} products updated.`, data: result })
        } catch (error) {
            next(error)
        }
    }

    async getLowStock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await inventoryService.getLowStock(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }
}

export const inventoryController = new InventoryController()