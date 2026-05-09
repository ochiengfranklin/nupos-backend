import { Response, NextFunction } from 'express'
import { customerService } from '../services/customer.service'
import { sendSuccess } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'
import {
    createCustomerSchema,
    updateCustomerSchema,
    customerQuerySchema,
} from '../validators/customer.validator'

export class CustomerController {

    async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const query  = customerQuerySchema.parse(req.query)
            const result = await customerService.getAll(req.user!.shopId, query)
            sendSuccess(res, { data: result.data, meta: result.meta })
        } catch (error) {
            next(error)
        }
    }

    async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id   = String(req.params.id)
            const data = await customerService.getById(id, req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async getWithHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id   = String(req.params.id)
            const data = await customerService.getWithHistory(id, req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = createCustomerSchema.parse(req.body)
            const data  = await customerService.create(req.user!.shopId, input)
            sendSuccess(res, {
                message:    'Customer created successfully',
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
            const input = updateCustomerSchema.parse(req.body)
            const data  = await customerService.update(id, req.user!.shopId, input)
            sendSuccess(res, { message: 'Customer updated successfully', data })
        } catch (error) {
            next(error)
        }
    }

    async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = String(req.params.id)
            await customerService.deactivate(id, req.user!.shopId)
            sendSuccess(res, { message: 'Customer deactivated successfully' })
        } catch (error) {
            next(error)
        }
    }

    async getTopCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : 10
            const data  = await customerService.getTopCustomers(req.user!.shopId, limit)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }
}

export const customerController = new CustomerController()