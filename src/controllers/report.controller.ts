import { Response, NextFunction } from 'express'
import { reportService } from '../services/report.service'
import { sendSuccess, sendError } from '../utils/response'
import { HTTP_STATUS } from '../constants'
import { AuthenticatedRequest } from '../types'

export class ReportController {

    async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await reportService.getDashboardSummary(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async getSalesReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { startDate, endDate } = req.query

            if (!startDate || !endDate) {
                sendError(res, {
                    message: 'startDate and endDate are required',
                    statusCode: HTTP_STATUS.BAD_REQUEST,
                })
                return
            }

            const data = await reportService.getSalesReport(
                req.user!.shopId,
                String(startDate),
                String(endDate),
            )
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async getTopProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { startDate, endDate, limit } = req.query
            const data = await reportService.getTopProducts(
                req.user!.shopId,
                startDate ? String(startDate) : undefined,
                endDate   ? String(endDate)   : undefined,
                limit     ? Number(limit)     : 10,
            )
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async getInventoryReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await reportService.getInventoryReport(req.user!.shopId)
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }

    async getCashierReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { startDate, endDate } = req.query
            const data = await reportService.getCashierReport(
                req.user!.shopId,
                startDate ? String(startDate) : undefined,
                endDate   ? String(endDate)   : undefined,
            )
            sendSuccess(res, { data })
        } catch (error) {
            next(error)
        }
    }
}

export const reportController = new ReportController()