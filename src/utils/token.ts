import jwt from 'jsonwebtoken'
import { config } from '../config/env'
import { JwtPayload } from '../types'

// Sign a short-lived access token (15 minutes)
// Contains everything middleware needs: userId, shopId, role, email
export const signAccessToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions)
}

// Sign a long-lived refresh token (7 days)
// Contains only userId and shopId — minimal surface area
// (pick) - pick only userId and shopId from jwtpayload
export const signRefreshToken = (payload: Pick<JwtPayload, 'userId' | 'shopId'>): string => {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions)
}

// Verify and decode an access token
// Throws if expired or tampered with — caught by errorHandler
export const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(token, config.jwt.secret) as JwtPayload
}

// Verify and decode a refresh token
export const verifyRefreshToken = (token: string): Pick<JwtPayload, 'userId' | 'shopId'> => {
    return jwt.verify(token, config.jwt.refreshSecret) as Pick<JwtPayload, 'userId' | 'shopId'>
}