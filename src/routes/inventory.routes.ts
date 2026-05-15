import { Router } from 'express'
import { inventoryController } from '../controllers/inventory.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()

router.use(authenticate)

// All roles can view movements and low stock
router.get('/movements', (req, res, next) =>
    inventoryController.getMovements(req as AuthenticatedRequest, res, next))

router.get('/low-stock', (req, res, next) =>
    inventoryController.getLowStock(req as AuthenticatedRequest, res, next))

// Only managers and storekeepers can adjust stock
router.post('/adjust', authorize('MANAGER', 'STOREKEEPER'), (req, res, next) =>
    inventoryController.adjustStock(req as AuthenticatedRequest, res, next))

router.post('/stock-take', authorize('MANAGER', 'STOREKEEPER'), (req, res, next) =>
    inventoryController.stockTake(req as AuthenticatedRequest, res, next))

export default router