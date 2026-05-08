import { Request } from 'express';

// Roles that exist in the system
export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STOREKEEPER';

// What we store inside the JWT payload
export interface JwtPayload {
    userId: string;
    shopId: string;
    role: UserRole;
    email: string;
}

// Every authenticated request has this attached after the auth middleware runs
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

// Standard shape of every API response
export interface ApiResponse<T = null> {
    success: boolean;
    message: string;
    data?: T;
    meta?: PaginationMeta;
    errors?: ValidationError[];
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ValidationError {
    field: string;
    message: string;
}