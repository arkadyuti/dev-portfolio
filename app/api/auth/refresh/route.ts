import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt-node'
import { getSession, createSession, deleteSession, deleteAllUserSessions } from '@/lib/auth/session'

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'No refresh token provided',
            code: 'NO_REFRESH_TOKEN',
          },
        },
        { status: 401 }
      )
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid or expired refresh token',
            code: 'INVALID_REFRESH_TOKEN',
          },
        },
        { status: 401 }
      )
    }

    // Verify old session exists in Redis
    const oldSession = await getSession(payload.sessionId)

    if (!oldSession) {
      // Token reuse detected: Refresh token used but session doesn't exist
      // This means the token was already used once (session was rotated)
      // Attacker might have stolen the token - revoke all user sessions
      console.warn(`[SECURITY] Token reuse detected for user ${payload.userId}`)
      await deleteAllUserSessions(payload.userId)

      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Token reuse detected. All sessions have been revoked for security.',
            code: 'TOKEN_REUSE_DETECTED',
          },
        },
        { status: 401 }
      )
    }

    // Create new session with new ID (session rotation for security)
    const newSession = await createSession({
      userId: oldSession.userId,
      email: oldSession.email,
      role: oldSession.role,
      userAgent: oldSession.userAgent,
      ipAddress: oldSession.ipAddress,
    })

    // Delete old session
    await deleteSession(payload.sessionId)

    // Generate new tokens with new session ID (token rotation, email not in JWT per GDPR)
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      role: payload.role,
      sessionId: newSession.sessionId,
    })

    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      role: payload.role,
      sessionId: newSession.sessionId,
    })

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: 'Tokens refreshed successfully',
        },
      },
      { status: 200 }
    )

    // Set new HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const, // Strict to prevent CSRF attacks
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined, // Explicit domain (undefined = current domain)
    }

    response.cookies.set('accessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    })

    response.cookies.set('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error('Token refresh error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'An error occurred during token refresh',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}
