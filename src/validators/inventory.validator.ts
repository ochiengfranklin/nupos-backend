import { z } from 'zod'

export const adjustStockSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    type:      z.enum(['RESTOCK', 'ADJUSTMENT', 'DAMAGE', 'RETURN']),
    quantity:  z.number().int().min(1, 'Quantity must be at least 1'),
    reason:    z.string().min(1, 'Reason is required').max(500),
})

export const stockTakeSchema = z.object({
    items: z.array(z.object({
        productId:     z.string().uuid(),
        actualQuantity: z.number().int().min(0),
        reason:        z.string().optional(),
    })).min(1),
})

export type AdjustStockInput = z.infer<typeof adjustStockSchema>
export type StockTakeInput   = z.infer<typeof stockTakeSchema>