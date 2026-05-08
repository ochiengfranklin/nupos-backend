import { Response } from 'express';
import { ApiResponse, PaginationMeta, ValidationError } from '../types';
import { HTTP_STATUS } from '../constants';

export const sendSuccess = <T>(
    res: Response,
    options: {
        message?: string;
        data?: T;
        meta?: PaginationMeta;
        statusCode?: number;
    } = {}
): Response => {
    const { message = 'Success', data, meta, statusCode = HTTP_STATUS.OK } = options;

    const payload: ApiResponse<T> = { success: true, message };
    if (data !== undefined) payload.data = data;
    if (meta !== undefined) payload.meta = meta;

    return res.status(statusCode).json(payload);
};

export const sendError = (
    res: Response,
    options: {
        message?: string;
        errors?: ValidationError[];
        statusCode?: number;
    } = {}
): Response => {
    const { message = 'An error occurred', errors, statusCode = HTTP_STATUS.INTERNAL_ERROR } = options;

    const payload: ApiResponse = { success: false, message };
    if (errors !== undefined) payload.errors = errors;

    return res.status(statusCode).json(payload);
};