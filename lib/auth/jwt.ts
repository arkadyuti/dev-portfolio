import jwt from 'jsonwebtoken'
import * as jose from 'jose'

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: string
  email: string
  role: string
  sessionId: string
  iat?: number
  exp?: number
}

/**
 * JWT configuration constants
 */
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_TOKEN_EXPIRY = '15m' // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d' // 7 days

/**
 * Validate JWT secrets are configured
 */
if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets are not configured in environment variables')
}

/**
 * Edge-compatible secret keys for jose library
 */
const getEdgeSecretKey = (secret: string) => new TextEncoder().encode(secret)

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  })
}

/**
 * Generate refresh token (long-lived)
 * Note: Refresh tokens are also JWTs but with different secret and expiry
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256',
  })
}

/**
 * Verify and decode access token
 * Uses jose library for Edge runtime compatibility
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getEdgeSecretKey(JWT_ACCESS_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    // Validate payload has required fields
    if (
      !payload ||
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.sessionId !== 'string'
    ) {
      return null
    }

    return payload as unknown as JWTPayload
  } catch (error) {
    // Token expired, invalid, or malformed (silent fail for security)
    return null
  }
}

/**
 * Verify and decode access token (sync version for Node.js runtime)
 * Use this in API routes where you need synchronous verification
 */
export function verifyAccessTokenSync(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload

    return decoded
  } catch (error) {
    // Token expired, invalid, or malformed
    if (error instanceof jwt.TokenExpiredError) {
      console.log('[JWT] Access token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('[JWT] Invalid access token:', error.message)
    } else {
      console.error('[JWT] Token verification error:', error)
    }
    return null
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload

    return decoded
  } catch (error) {
    // Token expired, invalid, or malformed
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Refresh token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid refresh token')
    }
    return null
  }
}

/**
 * Decode token without verification (for debugging)
 * WARNING: Do not use for authentication - only for inspection
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Get token expiry time in seconds
 */
export function getTokenExpiry(token: string): number | null {
  const decoded = decodeToken(token)
  return decoded?.exp || null
}

/**
 * Check if token is expired (without verification)
 */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token)
  if (!expiry) return true

  const now = Math.floor(Date.now() / 1000)
  return expiry < now
}
