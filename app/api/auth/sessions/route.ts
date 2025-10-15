import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getUserSessions, deleteSession, deleteAllUserSessions } from '@/lib/auth/session'

/**
 * GET /api/auth/sessions
 * Get all active sessions for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookie
    const accessToken = request.cookies.get('accessToken')?.value

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
        },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid or expired access token',
            code: 'INVALID_TOKEN',
          },
        },
        { status: 401 }
      )
    }

    // Get all sessions for user
    const sessions = await getUserSessions(payload.userId)

    // Format sessions for response
    const formattedSessions = sessions.map((session) => ({
      sessionId: session.sessionId,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      isCurrent: session.sessionId === payload.sessionId,
    }))

    return NextResponse.json(
      {
        success: true,
        data: {
          sessions: formattedSessions,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get sessions error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'An error occurred while fetching sessions',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session (or all sessions)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get access token from cookie
    const accessToken = request.cookies.get('accessToken')?.value

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
        },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid or expired access token',
            code: 'INVALID_TOKEN',
          },
        },
        { status: 401 }
      )
    }

    // Get session ID from query parameter or body
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const revokeAll = searchParams.get('all') === 'true'

    if (revokeAll) {
      // Revoke all sessions for user
      const count = await deleteAllUserSessions(payload.userId)

      return NextResponse.json(
        {
          success: true,
          data: {
            message: `${count} session(s) revoked successfully`,
            count,
          },
        },
        { status: 200 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Session ID is required',
            code: 'MISSING_SESSION_ID',
          },
        },
        { status: 400 }
      )
    }

    // Revoke specific session
    await deleteSession(sessionId)

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Session revoked successfully',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete session error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'An error occurred while revoking session',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}
