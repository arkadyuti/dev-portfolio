import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import User from '@/models/user'
import { comparePassword } from '@/lib/auth/password'
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt-node'
import { createSession } from '@/lib/auth/session'
import {
  checkRateLimit,
  getClientIP,
  formatRateLimitError,
  resetRateLimit,
} from '@/lib/auth/rate-limit'
import { withDatabase } from '@/lib/api-middleware'

/**
 * Sign in request schema
 */
const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * POST /api/auth/signin
 * Authenticate user and create session
 */
async function handler(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const validation = signInSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: validation.error.errors[0].message,
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Rate limiting check (5 attempts per 15 minutes per IP)
    const clientIP = getClientIP(request.headers)
    const rateLimit = await checkRateLimit(clientIP, 'login')

    if (!rateLimit.allowed) {
      const error = formatRateLimitError(rateLimit)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: error.retryAfter,
          },
        },
        { status: 429 }
      )
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        },
        { status: 401 }
      )
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockMinutes = Math.ceil((user.lockUntil!.getTime() - Date.now()) / 1000 / 60)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Account locked due to too many failed attempts. Try again in ${lockMinutes} minute${lockMinutes === 1 ? '' : 's'}.`,
            code: 'ACCOUNT_LOCKED',
          },
        },
        { status: 423 }
      )
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash)

    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incrementFailedAttempts()

      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        },
        { status: 401 }
      )
    }

    // Reset failed login attempts on successful login
    await user.resetFailedAttempts()

    // Update last login time
    user.lastLogin = new Date()
    await user.save()

    // Reset rate limit for this IP on successful login
    await resetRateLimit(clientIP, 'login')

    // Get user agent for session tracking
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Create session in Redis
    const session = await createSession({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      userAgent,
      ipAddress: clientIP,
    })

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: session.sessionId,
    })

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: session.sessionId,
    })

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          },
          sessionId: session.sessionId,
        },
      },
      { status: 200 }
    )

    // Set HTTP-only cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    // Access token expires in 15 minutes
    response.cookies.set('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes in seconds
    })

    // Refresh token expires in 7 days
    response.cookies.set('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    })

    return response
  } catch (error) {
    console.error('Sign in error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'An error occurred during sign in',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}

// Export the handler wrapped with database middleware
export const POST = withDatabase(handler)
