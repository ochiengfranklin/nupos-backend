import { Router, Request, Response, NextFunction } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { AuthenticatedRequest } from '../types'

const router = Router()

// Public routes
router.post('/register', (req: Request, res: Response, next: NextFunction) =>
    authController.register(req, res, next))

router.post('/login', (req: Request, res: Response, next: NextFunction) =>
    authController.login(req, res, next))

router.post('/refresh', (req: Request, res: Response, next: NextFunction) =>
    authController.refresh(req, res, next))

// Protected routes
router.get('/me',
    authenticate,
    (req: Request, res: Response, next: NextFunction) =>
        authController.getMe(req as AuthenticatedRequest, res, next)
)

router.post('/logout',
    authenticate,
    (req: Request, res: Response, next: NextFunction) =>
        authController.logout(req, res)
)

export default router