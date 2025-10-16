import jwt from 'jsonwebtoken'

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
