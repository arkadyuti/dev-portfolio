import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt-node'
import { getSession, extendSession } from '@/lib/auth/session'

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

    // Verify session exists in Redis
    const session = await getSession(payload.sessionId)

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Session not found or expired',
            code: 'SESSION_NOT_FOUND',
          },
        },
        { status: 401 }
      )
    }

    // Extend session in Redis
    await extendSession(payload.sessionId)

    // Generate new tokens (token rotation)
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    })

    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
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
      sameSite: 'lax' as const,
      path: '/',
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
