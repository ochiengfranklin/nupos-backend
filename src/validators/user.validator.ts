import { z } from 'zod'

export const createUserSchema = z.object({
    name:     z.string().min(2, 'Name must be at least 2 characters').max(255),
    email:    z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    role: z.enum(['MANAGER', 'CASHIER', 'STOREKEEPER']),
})

export const updateUserSchema = z.object({
    name:  z.string().min(2).max(255).optional(),
    role:  z.enum(['MANAGER', 'CASHIER', 'STOREKEEPER']).optional(),
})

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const resetPasswordSchema = z.object({
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
})

export type CreateUserInput    = z.infer<typeof createUserSchema>
export type UpdateUserInput    = z.infer<typeof updateUserSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ResetPasswordInput  = z.infer<typeof resetPasswordSchema>