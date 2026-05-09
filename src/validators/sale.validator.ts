import { z } from 'zod'

export const createSaleSchema = z.object({
    // Each item the cashier is selling
    items: z
        .array(
            z.object({
                productId: z.string().uuid('Invalid product ID'),
                quantity:  z.number().int().min(1, 'Quantity must be at least 1'),
            })
        )
        .min(1, 'Sale must have at least one item'),

    paymentMethod: z.enum(['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER']),

    // Optional — if customer is known
    customerId: z.string().uuid().optional(),

    // Optional discount amount in KES
    discountAmount: z.number().min(0).default(0),

    // Optional notes from cashier
    notes: z.string().max(500).optional(),

    // M-Pesa transaction reference (required if paymentMethod = MPESA)
    paymentReference: z.string().optional(),
})

export const saleQuerySchema = z.object({
    page:          z.coerce.number().int().min(1).default(1),
    limit:         z.coerce.number().int().min(1).max(100).default(20),
    startDate:     z.string().optional(),
    endDate:       z.string().optional(),
    cashierId:     z.string().uuid().optional(),
    paymentMethod: z.enum(['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER']).optional(),
    status:        z.enum(['COMPLETED', 'REFUNDED', 'VOIDED']).optional(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type SaleQueryInput  = z.infer<typeof saleQuerySchema>