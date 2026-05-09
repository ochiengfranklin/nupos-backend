import { Response, NextFunction } from 'express'
import { userService } from '../services/user.service'
import { sendSuccess } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'
import {
    createUserSchema,
    updateUserSchema,
    changePasswordSchema,
    resetPasswordSchema,
} from '../validators/user.validator'

export class UserController {

    async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await userService.getAll(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id   = String(req.params.id)
            const data = await userService.getById(id, req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = createUserSchema.parse(req.body)
            const data  = await userService.create(req.user!.shopId, input)
            sendSuccess(res, {
                message:    'User created successfully',
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
            const input = updateUserSchema.parse(req.body)
            const data  = await userService.update(id, req.user!.shopId, input)
            sendSuccess(res, { message: 'User updated successfully', data })
        } catch (error) {
            next(error)
        }
    }

    async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = String(req.params.id)
            await userService.deactivate(id, req.user!.shopId, req.user!.userId)
            sendSuccess(res, { message: 'User deactivated successfully' })
        } catch (error) {
            next(error)
        }
    }

    async reactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = String(req.params.id)
            await userService.reactivate(id, req.user!.shopId)
            sendSuccess(res, { message: 'User reactivated successfully' })
        } catch (error) {
            next(error)
        }
    }

    async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = changePasswordSchema.parse(req.body)
            await userService.changePassword(req.user!.userId, req.user!.shopId, input)
            sendSuccess(res, { message: 'Password changed successfully' })
        } catch (error) {
            next(error)
        }
    }

    async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id    = String(req.params.id)
            const input = resetPasswordSchema.parse(req.body)
            await userService.resetPassword(id, req.user!.shopId, input)
            sendSuccess(res, { message: 'Password reset successfully' })
        } catch (error) {
            next(error)
        }
    }
}

export const userController = new UserController()