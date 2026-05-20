import { Router } from 'express'
import { shopController } from '../controllers/shop.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { AuthenticatedRequest } from '../types'

const router = Router()
router.use(authenticate)

router.get('/', (req, res, next) =>
    shopController.getShop(req as AuthenticatedRequest, res, next))

router.put('/', authorize('MANAGER'), (req, res, next) =>
    shopController.updateShop(req as AuthenticatedRequest, res, next))

export default router