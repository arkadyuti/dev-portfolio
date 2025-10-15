import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

/**
 * Middleware to protect routes
 * Verifies access token validity
 *
 * Note: Redis session validation happens in server components/API routes
 * Middleware only does JWT validation (Edge runtime compatible)
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
