import { Response, NextFunction } from 'express'
import { saleService } from '../services/sale.service'
import { sendSuccess } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'
import { createSaleSchema, saleQuerySchema } from '../validators/sale.validator'

export class SaleController {

    async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input  = createSaleSchema.parse(req.body)
            const result = await saleService.createSale(
                req.user!.shopId,
                req.user!.userId,
                input
            )
            sendSuccess(res, {
                message:    'Sale completed successfully',
                data:       result,
                statusCode: HTTP_STATUS.CREATED,
            })
        } catch (error) {
            next(error)
        }
    }

    async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const query  = saleQuerySchema.parse(req.query)
            const result = await saleService.getAll(req.user!.shopId, query)
            sendSuccess(res, { data: result.data, meta: result.meta })
        } catch (error) {
            next(error)
        }
    }

    async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id   = String(req.params.id)
            const data = await saleService.getById(id, req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async voidSale(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = String(req.params.id)
            await saleService.voidSale(id, req.user!.shopId, req.user!.userId)
            sendSuccess(res, { message: 'Sale voided successfully' })
        } catch (error) {
            next(error)
        }
    }
}

export const saleController = new SaleController()