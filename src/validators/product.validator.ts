import { z } from 'zod'

export const createProductSchema = z.object({
    name:              z.string().min(1, 'Product name is required').max(255),
    description:       z.string().max(1000).optional(),
    sku:               z.string().max(100).optional(),
    barcode:           z.string().max(100).optional(),
    price:             z.number().positive('Price must be greater than 0'),
    costPrice:         z.number().min(0).default(0),
    stockQuantity:     z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(5),
    categoryId:        z.string().uuid('Invalid category ID').optional(),
})

// Reuse the create product schema for updates, but make all fields optional
export const updateProductSchema = createProductSchema.partial()

export const productQuerySchema = z.object({
    page:       z.coerce.number().int().min(1).default(1),
    limit:      z.coerce.number().int().min(1).max(100).default(20),
    search:     z.string().optional(),
    categoryId: z.string().uuid().optional(),
    lowStock:   z.coerce.boolean().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductQueryInput  = z.infer<typeof productQuerySchema>