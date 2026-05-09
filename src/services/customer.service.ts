import { eq, and, ilike, sql, desc } from 'drizzle-orm'
import { db } from '../db'
import { customers, sales, saleItems, products } from '../db/schema'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import {
    CreateCustomerInput,
    UpdateCustomerInput,
    CustomerQueryInput,
} from '../validators/customer.validator'

export class CustomerService {

    //   Get all customers with pagination + search
    async getAll(shopId: string, query: CustomerQueryInput) {
        const { page, limit, search } = query
        const offset = (page - 1) * limit

        const conditions = [eq(customers.shopId, shopId)]

        if (search) {
            conditions.push(
                ilike(customers.name, `%${search}%`)
            )
        }

        const whereClause = and(...conditions)

        const [data, countResult] = await Promise.all([
            db
                .select({
                    id:         customers.id,
                    name:       customers.name,
                    phone:      customers.phone,
                    email:      customers.email,
                    totalSpent: customers.totalSpent,
                    isActive:   customers.isActive,
                    createdAt:  customers.createdAt,
                })
                .from(customers)
                .where(whereClause)
                .orderBy(desc(customers.totalSpent))
                .limit(limit)
                .offset(offset),

            db
                .select({ count: sql<number>`count(*)` })
                .from(customers)
                .where(whereClause),
        ])

        return {
            data,
            meta: {
                total:      Number(countResult[0].count),
                page,
                limit,
                totalPages: Math.ceil(Number(countResult[0].count) / limit),
            },
        }
    }

    //  Get single customer
    async getById(id: string, shopId: string) {
        const [customer] = await db
            .select()
            .from(customers)
            .where(and(
                eq(customers.id, id),
                eq(customers.shopId, shopId)
            ))
            .limit(1)

        if (!customer) {
            throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND)
        }

        return customer
    }

    //  Get customer with full purchase history
    async getWithHistory(id: string, shopId: string) {
        const customer = await this.getById(id, shopId)

        // Get their last 10 sales
        const purchaseHistory = await db
            .select({
                id:            sales.id,
                receiptNumber: sales.receiptNumber,
                totalAmount:   sales.totalAmount,
                paymentMethod: sales.paymentMethod,
                status:        sales.status,
                createdAt:     sales.createdAt,
            })
            .from(sales)
            .where(and(
                eq(sales.customerId, id),
                eq(sales.shopId, shopId),
                eq(sales.status, 'COMPLETED'),
            ))
            .orderBy(desc(sales.createdAt))
            .limit(10)

        return {
            ...customer,
            purchaseHistory,
        }
    }

    //  Create customer
    async create(shopId: string, input: CreateCustomerInput) {
        // Check phone uniqueness within shop if provided
        if (input.phone) {
            const [existing] = await db
                .select({ id: customers.id })
                .from(customers)
                .where(and(
                    eq(customers.shopId, shopId),
                    eq(customers.phone, input.phone)
                ))
                .limit(1)

            if (existing) {
                throw new AppError(
                    'A customer with this phone number already exists',
                    HTTP_STATUS.CONFLICT
                )
            }
        }

        const [customer] = await db
            .insert(customers)
            .values({
                shopId,
                name:  input.name,
                phone: input.phone,
                email: input.email,
            })
            .returning()

        return customer
    }

    //   Update customer
    async update(id: string, shopId: string, input: UpdateCustomerInput) {
        await this.getById(id, shopId)

        // If phone is being changed check it is not taken
        if (input.phone) {
            const [existing] = await db
                .select({ id: customers.id })
                .from(customers)
                .where(and(
                    eq(customers.shopId, shopId),
                    eq(customers.phone, input.phone)
                ))
                .limit(1)

            if (existing && existing.id !== id) {
                throw new AppError(
                    'A customer with this phone number already exists',
                    HTTP_STATUS.CONFLICT
                )
            }
        }

        const [updated] = await db
            .update(customers)
            .set({
                ...input,
                updatedAt: new Date(),
            })
            .where(and(
                eq(customers.id, id),
                eq(customers.shopId, shopId)
            ))
            .returning()

        return updated
    }

    //  Deactivate customer
    async deactivate(id: string, shopId: string) {
        await this.getById(id, shopId)

        await db
            .update(customers)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(
                eq(customers.id, id),
                eq(customers.shopId, shopId)
            ))
    }

    // Get top customers by spend
    async getTopCustomers(shopId: string, limit = 10) {
        return db
            .select({
                id:         customers.id,
                name:       customers.name,
                phone:      customers.phone,
                totalSpent: customers.totalSpent,
            })
            .from(customers)
            .where(and(
                eq(customers.shopId, shopId),
                eq(customers.isActive, true),
            ))
            .orderBy(desc(customers.totalSpent))
            .limit(limit)
    }
}

export const customerService = new CustomerService()