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

/**
 * Validate JWT secrets are configured
 */
if (!JWT_ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET is not configured in environment variables')
}

/**
 * Edge-compatible secret key for jose library
 */
const getEdgeSecretKey = (secret: string) => new TextEncoder().encode(secret)

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
