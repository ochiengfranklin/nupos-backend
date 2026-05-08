export const ROLES = {
    OWNER: 'OWNER',
    MANAGER: 'MANAGER',
    CASHIER: 'CASHIER',
    STOREKEEPER: 'STOREKEEPER',
} as const;

// What each role is allowed to do
// Used by the RBAC middleware in Step 3
export const ROLE_PERMISSIONS = {
    OWNER: ['*'], // Full access to everything
    MANAGER: [
        'products:read', 'products:write',
        'inventory:read', 'inventory:write',
        'sales:read', 'sales:write',
        'reports:read',
        'customers:read', 'customers:write',
    ],
    CASHIER: [
        'products:read',
        'sales:write', 'sales:read',
        'customers:read',
    ],
    STOREKEEPER: [
        'products:read',
        'inventory:read', 'inventory:write',
    ],
} as const;

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
} as const;