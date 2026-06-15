import * as jose from 'jose'

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

/**
 * Validate JWT secrets are configured
 */
if (!JWT_ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET is not configured in environment variables')
}

/**
 * Edge-compatible secret key for jose library.
 *
 * Uses the web-standard TextEncoder, which is available in both the Next.js
 * Edge runtime (where this module runs via middleware) and Node.js. The
 * jwt-edge unit tests run under the `node` environment so jose's internal
 * `instanceof Uint8Array` check sees a same-realm typed array — jsdom
 * polyfills TextEncoder in a different realm, which would break verification
 * in tests only, never in production.
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
      maxTokenAge: '15m', // Extra safety: reject if older than 15 min
      clockTolerance: 0, // No clock skew tolerance
    })

    // Validate payload has required fields
    if (
      !payload ||
      typeof payload.userId !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.sessionId !== 'string'
    ) {
      return null
    }

    // Validate role is one of the allowed values
    if (!['admin', 'editor', 'viewer'].includes(payload.role as string)) {
      return null
    }

    return payload as unknown as JWTPayload
  } catch (error) {
    // Token expired, invalid, or malformed (silent fail for security)
    return null
  }
}
