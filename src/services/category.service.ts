import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { categories } from '../db/schema'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator'

export class CategoryService {

    // Get all categories for a shop
    async getAll(shopId: string) {
        return db
            .select()
            .from(categories)
            .where(and(
                eq(categories.shopId, shopId),
                eq(categories.isActive, true)
            ))
            .orderBy(categories.name)
    }

    // Get single category
    async getById(id: string, shopId: string) {
        const [category] = await db
            .select()
            .from(categories)
            .where(and(
                eq(categories.id, id),
                eq(categories.shopId, shopId)
            ))
            .limit(1)

        if (!category) {
            throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND)
        }

        return category
    }

    // Create category
    async create(shopId: string, input: CreateCategoryInput) {
        const [category] = await db
            .insert(categories)
            .values({
                shopId,
                name:        input.name,
                description: input.description,
            })
            .returning()

        return category
    }

    // Update category
    async update(id: string, shopId: string, input: UpdateCategoryInput) {
        // Confirm it exists and belongs to this shop before updating
        await this.getById(id, shopId)

        const [updated] = await db
            .update(categories)
            .set({
                ...input,
                updatedAt: new Date(),
            })
            .where(and(
                eq(categories.id, id),
                eq(categories.shopId, shopId)
            ))
            .returning()

        return updated
    }

    //Delete category (soft delete)
    // never hard delete —  just mark as inactive
    // This preserves historical data for products that used this category
    async delete(id: string, shopId: string) {
        await this.getById(id, shopId)

        await db
            .update(categories)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(
                eq(categories.id, id),
                eq(categories.shopId, shopId)
            ))
    }
}

export const categoryService = new CategoryService()