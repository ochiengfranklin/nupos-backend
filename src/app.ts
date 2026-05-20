import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { config } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { sendError } from './utils/response'
import { HTTP_STATUS } from './constants'

 // routes
import authRoutes from './routes/auth.routes'
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import saleRoutes from "./routes/sale.routes";
import reportRoutes from "./routes/report.routes";
import userRoutes from "./routes/user.routes";
import customerRoutes from "./routes/customer.routes";
import inventoryRoutes from "./routes/inventory.routes";
import supplierRoutes from "./routes/supplier.routes";
import loyaltyRoutes from "./routes/loyalty.routes";
import shopRoutes from "./routes/shop.routes";

const app: Application = express()

// security headers
app.use(helmet())

 // CORS
app.use(cors({
    origin: config.cors.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

 // body-parsing
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

 // request logging
if (config.isDev) {
    app.use(morgan('dev'))
}

//global rate limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api', globalLimiter)

 // auth rate-limiter
// Tighter limit on login and register to prevent brute force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/auth/login',    authLimiter)
app.use('/api/auth/register', authLimiter)

 // health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        success:     true,
        message:     'POS API is running',
        environment: config.nodeEnv,
        timestamp:   new Date().toISOString(),
    })
})

 // api routes
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products',   productRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/users', userRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/loyalty', loyaltyRoutes)
app.use('/api/shop', shopRoutes)

// 404 handler
app.use((req: Request, res: Response) => {
    sendError(res, {
        message:    `Route ${req.method} ${req.path} not found`,
        statusCode: HTTP_STATUS.NOT_FOUND,
    })
})

// ── Global error handler (must be last)
app.use(errorHandler)

export default app