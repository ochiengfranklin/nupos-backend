import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { config } from '../config/env';
import { sendError } from '../utils/response';
import { HTTP_STATUS } from '../constants';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_ERROR) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): Response => {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);
    if (config.isDev) console.error(err.stack);

    // Prisma: record not found
    if ((err as any).code === 'P2025') {
        return sendError(res, { message: 'Record not found', statusCode: HTTP_STATUS.NOT_FOUND });
    }

    // Prisma: unique constraint violation
    if ((err as any).code === 'P2002') {
        const field = (err as any).meta?.target?.[0] || 'field';
        return sendError(res, { message: `${field} already exists`, statusCode: HTTP_STATUS.CONFLICT });
    }

    // JWT errors
    if (err.name === 'TokenExpiredError') {
        return sendError(res, { message: 'Token expired, please login again', statusCode: HTTP_STATUS.UNAUTHORIZED });
    }
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, { message: 'Invalid token', statusCode: HTTP_STATUS.UNAUTHORIZED });
    }

    // Zod 4 validation errors
    if (err instanceof ZodError) {
        return sendError(res, {
            message: 'Validation failed',
            errors: err.issues.map((issue: ZodIssue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
            statusCode: HTTP_STATUS.UNPROCESSABLE,
        });
    }

    // Known operational error
    if (err instanceof AppError) {
        return sendError(res, { message: err.message, statusCode: err.statusCode });
    }

    // Unknown — never leak internals in production
    return sendError(res, {
        message: config.isProd ? 'Internal server error' : err.message,
        statusCode: HTTP_STATUS.INTERNAL_ERROR,
    });
};