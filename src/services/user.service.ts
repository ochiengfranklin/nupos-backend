import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'
import { hashPassword, comparePassword } from '../utils/hash'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import {
    CreateUserInput,
    UpdateUserInput,
    ChangePasswordInput,
    ResetPasswordInput,
} from '../validators/user.validator'

export class UserService {

    //   Get all users in a shop
    async getAll(shopId: string) {
        return db
            .select({
                id:        users.id,
                name:      users.name,
                email:     users.email,
                role:      users.role,
                isActive:  users.isActive,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.shopId, shopId))
            .orderBy(users.role, users.name)
    }

    //  Get single user
    async getById(id: string, shopId: string) {
        const [user] = await db
            .select({
                id:        users.id,
                name:      users.name,
                email:     users.email,
                role:      users.role,
                isActive:  users.isActive,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(and(
                eq(users.id, id),
                eq(users.shopId, shopId)
            ))
            .limit(1)

        if (!user) {
            throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
        }

        return user
    }

    //  Create a new user in the shop
    // Only owners and managers can do this
    // Notice: OWNER role cannot be created here — there is only one owner
    // The owner is created during shop registration
    async create(shopId: string, input: CreateUserInput) {
        // Check email is not already taken in this shop
        const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(and(
                eq(users.shopId, shopId),
                eq(users.email, input.email)
            ))
            .limit(1)

        if (existing) {
            throw new AppError(
                'A user with this email already exists in this shop',
                HTTP_STATUS.CONFLICT
            )
        }

        const passwordHash = await hashPassword(input.password)

        const [user] = await db
            .insert(users)
            .values({
                shopId,
                name:         input.name,
                email:        input.email,
                passwordHash,
                role:         input.role,
            })
            .returning({
                id:        users.id,
                name:      users.name,
                email:     users.email,
                role:      users.role,
                isActive:  users.isActive,
                createdAt: users.createdAt,
            })

        return user
    }

    // Update user name or role
    async update(id: string, shopId: string, input: UpdateUserInput) {
        // Confirm user exists in this shop
        await this.getById(id, shopId)

        const [updated] = await db
            .update(users)
            .set({
                ...input,
                updatedAt: new Date(),
            })
            .where(and(
                eq(users.id, id),
                eq(users.shopId, shopId)
            ))
            .returning({
                id:        users.id,
                name:      users.name,
                email:     users.email,
                role:      users.role,
                isActive:  users.isActive,
                updatedAt: users.updatedAt,
            })

        return updated
    }

    // Deactivate a user
    // We never delete users — their sales history must remain intact
    // Deactivated users cannot login
    async deactivate(id: string, shopId: string, requestingUserId: string) {
        // Cannot deactivate yourself
        if (id === requestingUserId) {
            throw new AppError(
                'You cannot deactivate your own account',
                HTTP_STATUS.BAD_REQUEST
            )
        }

        const user = await this.getById(id, shopId)

        // Cannot deactivate the owner
        if (user.role === 'OWNER' as any) {
            throw new AppError(
                'The shop owner account cannot be deactivated',
                HTTP_STATUS.FORBIDDEN
            )
        }

        await db
            .update(users)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(
                eq(users.id, id),
                eq(users.shopId, shopId)
            ))
    }

    //  Reactivate a user
    async reactivate(id: string, shopId: string) {
        await this.getById(id, shopId)

        await db
            .update(users)
            .set({ isActive: true, updatedAt: new Date() })
            .where(and(
                eq(users.id, id),
                eq(users.shopId, shopId)
            ))
    }

    // Change own password
    // Any user can change their own password
    async changePassword(userId: string, shopId: string, input: ChangePasswordInput) {
        // Fetch with password hash — we need it to verify current password
        const [user] = await db
            .select()
            .from(users)
            .where(and(
                eq(users.id, userId),
                eq(users.shopId, shopId)
            ))
            .limit(1)

        if (!user) {
            throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
        }

        // Verify current password before allowing change
        const isValid = await comparePassword(input.currentPassword, user.passwordHash)
        if (!isValid) {
            throw new AppError('Current password is incorrect', HTTP_STATUS.UNAUTHORIZED)
        }

        // Prevent reusing the same password
        const isSame = await comparePassword(input.newPassword, user.passwordHash)
        if (isSame) {
            throw new AppError(
                'New password must be different from current password',
                HTTP_STATUS.BAD_REQUEST
            )
        }

        const passwordHash = await hashPassword(input.newPassword)

        await db
            .update(users)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(users.id, userId))
    }

    // Reset user password (owner/manager only)
    // Used when a cashier forgets their password
    // Owner or manager sets a new temporary password
    async resetPassword(id: string, shopId: string, input: ResetPasswordInput) {
        await this.getById(id, shopId)

        const passwordHash = await hashPassword(input.newPassword)

        await db
            .update(users)
            .set({ passwordHash, updatedAt: new Date() })
            .where(and(
                eq(users.id, id),
                eq(users.shopId, shopId)
            ))
    }
}

export const userService = new UserService()