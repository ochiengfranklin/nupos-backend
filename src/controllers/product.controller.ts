import { Response, NextFunction } from 'express'
import { productService } from '../services/product.service'
import { sendSuccess } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'
import {
    createProductSchema,
    updateProductSchema,
    productQuerySchema,
} from '../validators/product.validator'

export class ProductController {

    async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const query  = productQuerySchema.parse(req.query)
            const result = await productService.getAll(req.user!.shopId, query)
            sendSuccess(res, { data: result.data, meta: result.meta })
        } catch (error) {
            next(error)
        }
    }

    async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id   = String(req.params.id)
            const data = await productService.getById(id, req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = createProductSchema.parse(req.body)
            const data  = await productService.create(req.user!.shopId, req.user!.userId, input)
            sendSuccess(res, {
                message:    'Product created successfully',
                data,
                statusCode: HTTP_STATUS.CREATED,
            })
        } catch (error) {
            next(error)
        }
    }

    async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id    = String(req.params.id)
            const input = updateProductSchema.parse(req.body)
            const data  = await productService.update(id, req.user!.shopId, input)
            sendSuccess(res, { message: 'Product updated successfully', data })
        } catch (error) {
            next(error)
        }
    }

    async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = String(req.params.id)
            await productService.delete(id, req.user!.shopId)
            sendSuccess(res, { message: 'Product deleted successfully' })
        } catch (error) {
            next(error)
        }
    }
}

export const productController = new ProductController()