import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { deleteSession } from '@/lib/auth/session'

/**
 * POST /api/auth/signout
 * Sign out user and invalidate session
 */
export async function POST(request: NextRequest) {
  try {
    // Get access token from cookie
    const accessToken = request.cookies.get('accessToken')?.value

    if (accessToken) {
      // Verify and decode token to get session ID
      const payload = await verifyAccessToken(accessToken)

      if (payload?.sessionId) {
        // Delete session from Redis
        await deleteSession(payload.sessionId)
      }
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: 'Signed out successfully',
        },
      },
      { status: 200 }
    )

    // Clear auth cookies
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  } catch (error) {
    console.error('Sign out error:', error)

    // Even if there's an error, still clear cookies
    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: 'Signed out successfully',
        },
      },
      { status: 200 }
    )

    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  }
}
