import { z } from 'zod'

export const createSupplierSchema = z.object({
    name:    z.string().min(1, 'Supplier name is required').max(255),
    contact: z.string().max(100).optional(),
    phone:   z.string().max(20).optional(),
    email:   z.string().email().optional().or(z.literal('')),
    address: z.string().max(500).optional(),
    notes:   z.string().max(500).optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export const createPurchaseOrderSchema = z.object({
    supplierId: z.string().uuid().optional(),
    notes:      z.string().max(500).optional(),
    items: z.array(z.object({
        productId: z.string().uuid('Invalid product ID'),
        quantity:  z.number().int().min(1, 'Quantity must be at least 1'),
        unitCost:  z.number().min(0, 'Cost must be 0 or more'),
    })).min(1, 'Purchase order must have at least one item'),
})

export const receivePurchaseOrderSchema = z.object({
    items: z.array(z.object({
        purchaseOrderItemId: z.string().uuid(),
        receivedQty:         z.number().int().min(0),
    })),
    notes: z.string().optional(),
})

export type CreateSupplierInput       = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput       = z.infer<typeof updateSupplierSchema>
export type CreatePurchaseOrderInput  = z.infer<typeof createPurchaseOrderSchema>
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>