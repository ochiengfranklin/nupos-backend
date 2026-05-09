import { Router, Request, Response, NextFunction } from 'express'
import { saleController } from '../controllers/sale.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()

router.use(authenticate)

// Cashiers can create sales and view them
router.post('/',     (req, res, next) => saleController.create(req as AuthenticatedRequest, res, next))
router.get('/',      (req, res, next) => saleController.getAll(req as AuthenticatedRequest, res, next))
router.get('/:id',   (req, res, next) => saleController.getById(req as AuthenticatedRequest, res, next))

// Only managers and owners can void a sale
router.patch('/:id/void', authorize('MANAGER'), (req, res, next) =>
    saleController.voidSale(req as AuthenticatedRequest, res, next)
)

export default router