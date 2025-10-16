import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt-edge'

/**
 * Middleware to protect routes
 * Verifies JWT validity (Edge runtime compatible)
 *
 * Note: Redis session validation happens in Server Components (app/admin/layout.tsx)
 * because ioredis is not compatible with Edge runtime, and Next.js 15 middleware
 * always runs on Edge runtime regardless of the runtime export.
 *
 * This creates a ~15 minute window (JWT expiry) where revoked sessions can still
 * access protected routes at the middleware level, but the admin layout will
 * immediately check Redis and redirect if session is revoked.
 */
export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Get access token from cookies
    const accessToken = request.cookies.get('accessToken')?.value

    // If no access token, redirect to signin
    if (!accessToken) {
      const signInUrl = new URL('/signin', request.url)
      signInUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Verify access token (JWT validation only)
    const payload = await verifyAccessToken(accessToken)

    if (!payload) {
      // Token invalid or expired, redirect to signin
      const signInUrl = new URL('/signin', request.url)
      signInUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // User has valid JWT, allow request
    // Redis session validation happens in admin layout (Server Component)
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, redirect to signin for safety
    const signInUrl = new URL('/signin', request.url)
    signInUrl.searchParams.set('returnUrl', request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }
}

// Specify which routes to protect
export const config = {
  matcher: [
    '/admin/:path*', // Protect all /admin routes
  ],
}
