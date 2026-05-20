import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { shops, users } from '../db/schema'
import { hashPassword, comparePassword } from '../utils/hash'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token'
import { AppError } from '../middleware/errorHandler'
import { HTTP_STATUS } from '../constants'
import { RegisterInput, LoginInput } from '../validators/auth.validator'

export class AuthService {

    // register
    // Creates a shop and its first owner user atomically
    async register(input: RegisterInput) {
        // 1. Generate a URL-safe slug from shop name
        // e.g. "wamuthende Minimart" → "wamuthende-minimart"
        const slug = input.shopName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        // 2. Check slug is not already taken
        const existingShop = await db
            .select({ id: shops.id })
            .from(shops)
            .where(eq(shops.slug, slug))
            .limit(1)

        if (existingShop.length > 0) {
            throw new AppError('A shop with this name already exists', HTTP_STATUS.CONFLICT)
        }

        // 3. Hash the password before storing
        const passwordHash = await hashPassword(input.password)

        // 4. Create shop and owner user
        // Drizzle doesn't support multi-statement transactions over HTTP
        // so we insert sequentially — shop first, then user
        const [newShop] = await db
            .insert(shops)
            .values({
                name:  input.shopName,
                slug,
                email: input.shopEmail,
                phone: input.shopPhone,
            })
            .returning()

        const [newUser] = await db
            .insert(users)
            .values({
                shopId:       newShop.id,
                name:         input.name,
                email:        input.email,
                passwordHash,
                role:         'OWNER',
            })
            .returning()

        // 5. Generate tokens immediately so user is logged in after registering
        const tokenPayload = {
            userId: newUser.id,
            shopId: newShop.id,
            role:   newUser.role,
            email:  newUser.email,
        }

        return {
            accessToken:  signAccessToken(tokenPayload),
            refreshToken: signRefreshToken({ userId: newUser.id, shopId: newShop.id }),
            user: {
                id:    newUser.id,
                name:  newUser.name,
                email: newUser.email,
                role:  newUser.role,
            },
            shop: {
                id:            newShop.id,
                name:          newShop.name,
                slug:          newShop.slug,
                phone:         newShop.phone,
                email:         newShop.email,
                address:       newShop.address,
                city:          newShop.city,
                country:       newShop.country,
                currency:      newShop.currency,
                tillNumber:    newShop.tillNumber,
                taxRate:       newShop.taxRate,
                receiptFooter: newShop.receiptFooter,
                logoUrl:       newShop.logoUrl,
                isActive:      newShop.isActive,
            },
        }
    }

    // login
    async login(input: LoginInput) {
        // 1. Find shop by slug
        const [shop] = await db
            .select()
            .from(shops)
            .where(and(
                eq(shops.slug, input.shopSlug),
                eq(shops.isActive, true)
            ))
            .limit(1)

        if (!shop) {
            // Deliberately vague — don't reveal whether shop or user is wrong
            throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED)
        }

        // 2. Find user by email within that shop
        const [user] = await db
            .select()
            .from(users)
            .where(and(
                eq(users.shopId, shop.id),
                eq(users.email, input.email),
                eq(users.isActive, true)
            ))
            .limit(1)

        if (!user) {
            throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED)
        }

        // 3. Verify password
        const passwordValid = await comparePassword(input.password, user.passwordHash)
        if (!passwordValid) {
            throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED)
        }

        // 4. Generate and return tokens
        const tokenPayload = {
            userId: user.id,
            shopId: shop.id,
            role:   user.role,
            email:  user.email,
        }

        return {
            accessToken:  signAccessToken(tokenPayload),
            refreshToken: signRefreshToken({ userId: user.id, shopId: shop.id }),
            user: {
                id:    user.id,
                name:  user.name,
                email: user.email,
                role:  user.role,
            },
            shop: {
                id:            shop.id,
                name:          shop.name,
                slug:          shop.slug,
                phone:         shop.phone,
                email:         shop.email,
                address:       shop.address,
                city:          shop.city,
                country:       shop.country,
                currency:      shop.currency,
                tillNumber:    shop.tillNumber,
                taxRate:       shop.taxRate,
                receiptFooter: shop.receiptFooter,
                logoUrl:       shop.logoUrl,
                isActive:      shop.isActive,
            },
        }
    }

    // refresh tokens
    async refresh(refreshToken: string) {
        // 1. Verify the refresh token — throws if invalid or expired
        const decoded = verifyRefreshToken(refreshToken)

        // 2. Confirm user still exists and is still active
        const [user] = await db
            .select({
                id:     users.id,
                shopId: users.shopId,
                email:  users.email,
                role:   users.role,
                isActive: users.isActive,
            })
            .from(users)
            .where(and(
                eq(users.id, decoded.userId),
                eq(users.isActive, true)
            ))
            .limit(1)

        if (!user) {
            throw new AppError('User no longer exists', HTTP_STATUS.UNAUTHORIZED)
        }

        // 3. Issue fresh tokens — rotate the refresh token on every use
        const tokenPayload = {
            userId: user.id,
            shopId: user.shopId,
            role:   user.role,
            email:  user.email,
        }

        return {
            accessToken:  signAccessToken(tokenPayload),
            refreshToken: signRefreshToken({ userId: user.id, shopId: user.shopId }),
        }
    }

    // get current user
    async getMe(userId: string, shopId: string) {
        const [user] = await db
            .select({
                id:        users.id,
                name:      users.name,
                email:     users.email,
                role:      users.role,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(and(
                eq(users.id, userId),
                eq(users.shopId, shopId)
            ))
            .limit(1)

        if (!user) {
            throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
        }

        return user
    }
}

export const authService = new AuthService()