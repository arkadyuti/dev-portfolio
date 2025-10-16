import jwt from 'jsonwebtoken'

/**
 * JWT Payload interface
 * Note: Email removed from JWT to comply with GDPR (PII should not be in tokens)
 */
export interface JWTPayload {
  userId: string
  role: string
  sessionId: string
  v?: number // Secret version for rotation support
  iat?: number
  exp?: number
}

/**
 * JWT configuration constants
 */
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const JWT_SECRET_VERSION = parseInt(process.env.JWT_SECRET_VERSION || '1')
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
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'v'>): string {
  return jwt.sign({ ...payload, v: JWT_SECRET_VERSION }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  })
}

/**
 * Generate refresh token (long-lived)
 * Note: Refresh tokens are also JWTs but with different secret and expiry
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'v'>): string {
  return jwt.sign({ ...payload, v: JWT_SECRET_VERSION }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256',
  })
}

/**
 * Verify and decode access token (async version for middleware)
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  return verifyAccessTokenSync(token)
}

/**
 * Verify and decode access token (sync version for Node.js runtime)
 * Use this in API routes where you need synchronous verification
 */
export function verifyAccessTokenSync(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      maxAge: '15m', // Extra safety: reject if older than 15 min
      clockTolerance: 0, // No clock skew tolerance
    }) as JWTPayload

    // Validate role is one of the allowed values
    if (!['admin', 'editor', 'viewer'].includes(decoded.role)) {
      return null
    }

    return decoded
  } catch (error) {
    // Token expired, invalid, or malformed (silent fail for security)
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
      maxAge: '7d', // Extra safety: reject if older than 7 days
      clockTolerance: 0, // No clock skew tolerance
    }) as JWTPayload

    // Validate role is one of the allowed values
    if (!['admin', 'editor', 'viewer'].includes(decoded.role)) {
      return null
    }

    return decoded
  } catch (error) {
    // Token expired, invalid, or malformed (silent fail for security)
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
