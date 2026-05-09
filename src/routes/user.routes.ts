import { Router, Request, Response, NextFunction } from 'express'
import { userController } from '../controllers/user.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()

router.use(authenticate)

// View users — managers and owners
router.get('/', authorize('MANAGER'), (req, res, next) =>
    userController.getAll(req as AuthenticatedRequest, res, next))

router.get('/:id', authorize('MANAGER'), (req, res, next) =>
    userController.getById(req as AuthenticatedRequest, res, next))

// Create user — managers and owners
router.post('/', authorize('MANAGER'), (req, res, next) =>
    userController.create(req as AuthenticatedRequest, res, next))

// Update user role/name — managers and owners
router.put('/:id', authorize('MANAGER'), (req, res, next) =>
    userController.update(req as AuthenticatedRequest, res, next))

// Deactivate / reactivate — owners only
router.patch('/:id/deactivate', authorize('MANAGER'), (req, res, next) =>
    userController.deactivate(req as AuthenticatedRequest, res, next))

router.patch('/:id/reactivate', authorize('MANAGER'), (req, res, next) =>
    userController.reactivate(req as AuthenticatedRequest, res, next))

// Change own password — any authenticated user
router.patch('/me/password', (req, res, next) =>
    userController.changePassword(req as AuthenticatedRequest, res, next))

// Reset another user's password — owners and managers only
router.patch('/:id/reset-password', authorize('MANAGER'), (req, res, next) =>
    userController.resetPassword(req as AuthenticatedRequest, res, next))

export default router