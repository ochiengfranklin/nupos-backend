import { Router } from 'express'
import { loyaltyController } from '../controllers/loyalty.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()
router.use(authenticate)

// Settings — manager only
router.get('/settings', (req, res, next) =>
    loyaltyController.getSettings(req as AuthenticatedRequest, res, next))

router.put('/settings', authorize('MANAGER'), (req, res, next) =>
    loyaltyController.updateSettings(req as AuthenticatedRequest, res, next))

// Calculate points for an amount
router.get('/calculate', (req, res, next) =>
    loyaltyController.calculatePoints(req as AuthenticatedRequest, res, next))

// Customer loyalty
router.get('/customers/:customerId', (req, res, next) =>
    loyaltyController.getCustomerHistory(req as AuthenticatedRequest, res, next))

router.post('/customers/:customerId/adjust', authorize('MANAGER'), (req, res, next) =>
    loyaltyController.adjustPoints(req as AuthenticatedRequest, res, next))

router.post('/redeem', (req, res, next) =>
    loyaltyController.redeemPoints(req as AuthenticatedRequest, res, next))

export default router