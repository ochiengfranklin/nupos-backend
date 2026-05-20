import { eq } from 'drizzle-orm'
import { db } from '../db'
import { shops } from '../db/schema'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import { UpdateShopInput } from '../validators/shop.validator'

export class ShopService {

    async getShop(shopId: string) {
        const [shop] = await db
            .select()
            .from(shops)
            .where(eq(shops.id, shopId))
            .limit(1)

        if (!shop) throw new AppError('Shop not found', HTTP_STATUS.NOT_FOUND)
        return shop
    }

    async updateShop(shopId: string, input: UpdateShopInput) {
        // Destructure taxRate out so we don't spread a potential number into the query
        const { taxRate, ...restInput } = input

        const [updated] = await db
            .update(shops)
            .set({
                ...restInput,
                ...(taxRate !== undefined && { taxRate: taxRate.toString() }),
                updatedAt: new Date()
            })
            .where(eq(shops.id, shopId))
            .returning()

        return updated
    }
}

export const shopService = new ShopService()