import { Router, Request, Response, NextFunction } from 'express'
import { reportController } from '../controllers/report.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()

// All report routes require authentication
router.use(authenticate)

// Only owners and managers can see reports
router.get('/dashboard',  authorize('MANAGER'), (req, res, next) =>
    reportController.getDashboard(req as AuthenticatedRequest, res, next))

router.get('/sales',      authorize('MANAGER'), (req, res, next) =>
    reportController.getSalesReport(req as AuthenticatedRequest, res, next))

router.get('/products/top', authorize('MANAGER'), (req, res, next) =>
    reportController.getTopProducts(req as AuthenticatedRequest, res, next))

router.get('/inventory',  authorize('MANAGER'), (req, res, next) =>
    reportController.getInventoryReport(req as AuthenticatedRequest, res, next))

router.get('/cashiers',   authorize('MANAGER'), (req, res, next) =>
    reportController.getCashierReport(req as AuthenticatedRequest, res, next))

export default router