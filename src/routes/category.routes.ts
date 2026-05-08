import { Router, Request, Response, NextFunction } from 'express'
import { categoryController } from '../controllers/category.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()

// All category routes require authentication
router.use(authenticate)

// All users can view categories
router.get('/',    (req, res, next) => categoryController.getAll(req as AuthenticatedRequest, res, next))
router.get('/:id', (req, res, next) => categoryController.getById(req as AuthenticatedRequest, res, next))

// Only owners and managers can create, update, delete
router.post('/',    authorize('MANAGER'), (req, res, next) => categoryController.create(req as AuthenticatedRequest, res, next))
router.put('/:id',  authorize('MANAGER'), (req, res, next) => categoryController.update(req as AuthenticatedRequest, res, next))
router.delete('/:id', authorize('MANAGER'), (req, res, next) => categoryController.delete(req as AuthenticatedRequest, res, next))

export default router