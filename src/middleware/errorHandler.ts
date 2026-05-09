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
    next: NextFunction
): Response => {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err);

    // Postgres: duplicate key
    if ((err as any).cause?.code === '23505') {
        return sendError(res, {
            message: 'A record with this value already exists',
            statusCode: HTTP_STATUS.CONFLICT,
        })
    }

    // Postgres: foreign key violation
    if ((err as any).cause?.code === '23503') {
        return sendError(res, {
            message: 'Referenced record does not exist',
            statusCode: HTTP_STATUS.BAD_REQUEST,
        })
    }

    // Postgres: not null violation
    if ((err as any).cause?.code === '23502') {
        return sendError(res, {
            message: 'Required field is missing',
            statusCode: HTTP_STATUS.BAD_REQUEST,
        })
    }

    // JWT errors
    if (err.name === 'TokenExpiredError') {
        return sendError(res, {
            message: 'Token expired, please login again',
            statusCode: HTTP_STATUS.UNAUTHORIZED,
        })
    }
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, {
            message: 'Invalid token',
            statusCode: HTTP_STATUS.UNAUTHORIZED,
        })
    }

    // Zod validation errors
    if (err instanceof ZodError) {
        return sendError(res, {
            message: 'Validation failed',
            errors: err.issues.map((issue: ZodIssue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
            statusCode: HTTP_STATUS.UNPROCESSABLE,
        })
    }

    // Known operational error
    if (err instanceof AppError) {
        return sendError(res, {
            message: err.message,
            statusCode: err.statusCode,
        })
    }

    // Unknown — never leak internals in production
    return sendError(res, {
        message: config.isProd ? 'Internal server error' : err.message,
        statusCode: HTTP_STATUS.INTERNAL_ERROR,
    })
}