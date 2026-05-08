import { z } from 'zod'

// Register a new shop + owner in one request
export const registerSchema = z.object({
    shopName:  z.string().min(2, 'Shop name must be at least 2 characters').max(255),
    shopEmail: z.string().email('Invalid shop email').optional(),
    shopPhone: z.string().min(10, 'Invalid phone number').optional(),
    name:      z.string().min(2, 'Name must be at least 2 characters').max(255),
    email:     z.string().email('Invalid email address'),
    password:  z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const loginSchema = z.object({
    email:    z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    shopSlug: z.string().min(1, 'Shop identifier is required'),
})

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
})

// Types inferred directly from the schemas
// No need to define these manually — Zod does it
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput    = z.infer<typeof loginSchema>