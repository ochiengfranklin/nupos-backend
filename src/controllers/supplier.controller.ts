import { Response, NextFunction } from 'express'
import { supplierService } from '../services/supplier.service'
import { sendSuccess } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'
import {
    createSupplierSchema,
    updateSupplierSchema,
    createPurchaseOrderSchema,
    receivePurchaseOrderSchema,
} from '../validators/supplier.validator'

export class SupplierController {

    //  Suppliers
    async getAllSuppliers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await supplierService.getAllSuppliers(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) { next(error) }
    }

    async getSupplierById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await supplierService.getSupplierById(String(req.params.id), req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) { next(error) }
    }

    async createSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = createSupplierSchema.parse(req.body)
            const data  = await supplierService.createSupplier(req.user!.shopId, input)
            sendSuccess(res, { message: 'Supplier created successfully', data, statusCode: HTTP_STATUS.CREATED })
        } catch (error) { next(error) }
    }

    async updateSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = updateSupplierSchema.parse(req.body)
            const data  = await supplierService.updateSupplier(String(req.params.id), req.user!.shopId, input)
            sendSuccess(res, { message: 'Supplier updated successfully', data })
        } catch (error) { next(error) }
    }

    async deleteSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await supplierService.deleteSupplier(String(req.params.id), req.user!.shopId)
            sendSuccess(res, { message: 'Supplier deleted successfully' })
        } catch (error) { next(error) }
    }

    //   Purchase orders
    async getAllPurchaseOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await supplierService.getAllPurchaseOrders(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) { next(error) }
    }

    async getPurchaseOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await supplierService.getPurchaseOrderById(String(req.params.id), req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) { next(error) }
    }

    async createPurchaseOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = createPurchaseOrderSchema.parse(req.body)
            const data  = await supplierService.createPurchaseOrder(req.user!.shopId, req.user!.userId, input)
            sendSuccess(res, { message: 'Purchase order created', data, statusCode: HTTP_STATUS.CREATED })
        } catch (error) { next(error) }
    }

    async markAsOrdered(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await supplierService.markAsOrdered(String(req.params.id), req.user!.shopId)
            sendSuccess(res, { message: 'Order marked as ordered', data })
        } catch (error) { next(error) }
    }

    async receivePurchaseOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = receivePurchaseOrderSchema.parse(req.body)
            const data  = await supplierService.receivePurchaseOrder(
                String(req.params.id), req.user!.shopId, req.user!.userId, input
            )
            sendSuccess(res, { message: 'Purchase order received. Stock updated.', data })
        } catch (error) { next(error) }
    }

    async cancelPurchaseOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await supplierService.cancelPurchaseOrder(String(req.params.id), req.user!.shopId)
            sendSuccess(res, { message: 'Purchase order cancelled' })
        } catch (error) { next(error) }
    }
}

export const supplierController = new SupplierController()