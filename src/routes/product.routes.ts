import { Router, Request, Response, NextFunction } from 'express'
import { productController } from '../controllers/product.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()

// All product routes require authentication
router.use(authenticate)

// All roles can view products
router.get('/',     (req, res, next) => productController.getAll(req as AuthenticatedRequest, res, next))
router.get('/:id',  (req, res, next) => productController.getById(req as AuthenticatedRequest, res, next))

// Only owners and managers can create, update, delete
router.post('/',      authorize('MANAGER'), (req, res, next) => productController.create(req as AuthenticatedRequest, res, next))
router.put('/:id',    authorize('MANAGER'), (req, res, next) => productController.update(req as AuthenticatedRequest, res, next))
router.delete('/:id', authorize('MANAGER'), (req, res, next) => productController.delete(req as AuthenticatedRequest, res, next))

export default router