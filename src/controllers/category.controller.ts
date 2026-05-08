import { Response, NextFunction } from 'express'
import { categoryService } from '../services/category.service'
import { sendSuccess } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'
import {
    createCategorySchema,
    updateCategorySchema,
} from '../validators/category.validator'

export class CategoryController {

    async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await categoryService.getAll(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id   = String(req.params.id)
            const data = await categoryService.getById(id, req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = createCategorySchema.parse(req.body)
            const data  = await categoryService.create(req.user!.shopId, input)
            sendSuccess(res, {
                message:    'Category created successfully',
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
            const input = updateCategorySchema.parse(req.body)
            const data  = await categoryService.update(id, req.user!.shopId, input)
            sendSuccess(res, { message: 'Category updated successfully', data })
        } catch (error) {
            next(error)
        }
    }

    async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = String(req.params.id)
            await categoryService.delete(id, req.user!.shopId)
            sendSuccess(res, { message: 'Category deleted successfully' })
        } catch (error) {
            next(error)
        }
    }
}

export const categoryController = new CategoryController()