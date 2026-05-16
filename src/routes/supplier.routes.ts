import { Router } from 'express'
import { supplierController } from '../controllers/supplier.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()
router.use(authenticate)
router.use(authorize('MANAGER', 'STOREKEEPER'))

// Suppliers
router.get('/',    (req, res, next) => supplierController.getAllSuppliers(req as AuthenticatedRequest, res, next))
router.get('/:id', (req, res, next) => supplierController.getSupplierById(req as AuthenticatedRequest, res, next))
router.post('/',   (req, res, next) => supplierController.createSupplier(req as AuthenticatedRequest, res, next))
router.put('/:id', (req, res, next) => supplierController.updateSupplier(req as AuthenticatedRequest, res, next))
router.delete('/:id', (req, res, next) => supplierController.deleteSupplier(req as AuthenticatedRequest, res, next))

// Purchase orders
router.get('/orders',         (req, res, next) => supplierController.getAllPurchaseOrders(req as AuthenticatedRequest, res, next))
router.get('/orders/:id',     (req, res, next) => supplierController.getPurchaseOrderById(req as AuthenticatedRequest, res, next))
router.post('/orders',        (req, res, next) => supplierController.createPurchaseOrder(req as AuthenticatedRequest, res, next))
router.patch('/orders/:id/order',   (req, res, next) => supplierController.markAsOrdered(req as AuthenticatedRequest, res, next))
router.patch('/orders/:id/receive', (req, res, next) => supplierController.receivePurchaseOrder(req as AuthenticatedRequest, res, next))
router.patch('/orders/:id/cancel',  (req, res, next) => supplierController.cancelPurchaseOrder(req as AuthenticatedRequest, res, next))

export default router