import { Response, NextFunction } from 'express'
import { sendError } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'
import { UserRole } from '../types'

// Usage: router.get('/reports', authenticate, authorize('OWNER', 'MANAGER'), controller)
export const authorize = (...allowedRoles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            sendError(res, {
                message: 'Not authenticated',
                statusCode: HTTP_STATUS.UNAUTHORIZED,
            })
            return
        }

        // OWNER always has access to everything
        if (req.user.role === 'OWNER') {
            next()
            return
        }

        // Check if user's role is in the allowed list
        if (!allowedRoles.includes(req.user.role)) {
            sendError(res, {
                message: 'You do not have permission to perform this action',
                statusCode: HTTP_STATUS.FORBIDDEN,
            })
            return
        }

        next()
    }
}