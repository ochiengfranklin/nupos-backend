import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'
import { sendSuccess, sendError } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
} from '../validators/auth.validator'

export class AuthController {

    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = registerSchema.parse(req.body)
            const result = await authService.register(input)
            sendSuccess(res, {
                message: 'Shop registered successfully',
                data: result,
                statusCode: HTTP_STATUS.CREATED,
            })
        } catch (error) {
            next(error)
        }
    }

    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = loginSchema.parse(req.body)
            const result = await authService.login(input)
            sendSuccess(res, {
                message: 'Login successful',
                data: result,
            })
        } catch (error) {
            next(error)
        }
    }

    async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { refreshToken } = refreshTokenSchema.parse(req.body)
            const result = await authService.refresh(refreshToken)
            sendSuccess(res, {
                message: 'Tokens refreshed successfully',
                data: result,
            })
        } catch (error) {
            next(error)
        }
    }

    async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                sendError(res, {
                    message: 'Not authenticated',
                    statusCode: HTTP_STATUS.UNAUTHORIZED,
                })
                return
            }
            const user = await authService.getMe(req.user.userId, req.user.shopId)
            sendSuccess(res, { data: user })
        } catch (error) {
            next(error)
        }
    }

    async logout(_req: Request, res: Response): Promise<void> {
        sendSuccess(res, { message: 'Logged out successfully' })
    }
}

export const authController = new AuthController()