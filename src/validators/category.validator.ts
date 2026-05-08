import { z } from 'zod'

export const createCategorySchema = z.object({
    name:        z.string().min(1, 'Name is required').max(255),
    description: z.string().max(500).optional(),
})

// Reuse the create category schema for updates, but make all fields optional(.partial())
export const updateCategorySchema = createCategorySchema.partial()

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>