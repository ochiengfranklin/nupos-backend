import { Router, Request, Response, NextFunction } from 'express'
import { customerController } from '../controllers/customer.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()

router.use(authenticate)

// All roles can view and create customers
router.get('/', (req, res, next) =>
    customerController.getAll(req as AuthenticatedRequest, res, next))

router.get('/top', authorize('MANAGER'), (req, res, next) =>
    customerController.getTopCustomers(req as AuthenticatedRequest, res, next))

router.get('/:id', (req, res, next) =>
    customerController.getById(req as AuthenticatedRequest, res, next))

router.get('/:id/history', (req, res, next) =>
    customerController.getWithHistory(req as AuthenticatedRequest, res, next))

router.post('/', (req, res, next) =>
    customerController.create(req as AuthenticatedRequest, res, next))

// Only managers and owners can update and deactivate
router.put('/:id', authorize('MANAGER'), (req, res, next) =>
    customerController.update(req as AuthenticatedRequest, res, next))

router.patch('/:id/deactivate', authorize('MANAGER'), (req, res, next) =>
    customerController.deactivate(req as AuthenticatedRequest, res, next))

export default router