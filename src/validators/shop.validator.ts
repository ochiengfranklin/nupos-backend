import { z } from 'zod'

export const updateShopSchema = z.object({
    name:        z.string().min(1).max(255).optional(),
    phone:       z.string().max(20).optional(),
    email:       z.string().email().optional().or(z.literal('')),
    address:     z.string().max(500).optional(),
    city:        z.string().max(100).optional(),
    country:     z.string().max(100).optional(),
    currency:    z.string().max(10).optional(),
    tillNumber:  z.string().max(20).optional(),
    taxRate:     z.number().min(0).max(100).optional(),
    receiptFooter: z.string().max(500).optional(),
    logoUrl:     z.string().url().optional().or(z.literal('')),
})

export type UpdateShopInput = z.infer<typeof updateShopSchema>