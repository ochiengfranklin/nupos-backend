import { z } from 'zod'

export const createCustomerSchema = z.object({
    name:  z.string().min(2, 'Name must be at least 2 characters').max(255),
    phone: z.string().min(10, 'Invalid phone number').max(20).optional(),
    email: z.string().email('Invalid email').optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export const customerQuerySchema = z.object({
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerQueryInput  = z.infer<typeof customerQuerySchema>