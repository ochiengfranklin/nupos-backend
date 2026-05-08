import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/token'
import { sendError } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendError(res, {
            message: 'Access token required',
            statusCode: HTTP_STATUS.UNAUTHORIZED,
        })
        return
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyAccessToken(token)

        // Attach user to request
    ;(req as AuthenticatedRequest).user = decoded

    next()
}