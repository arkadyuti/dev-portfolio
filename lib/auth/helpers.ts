import { cookies } from 'next/headers'
import { verifyAccessToken } from './jwt'
import { getSession } from './session'
import type { UserRole } from '@/models/user'

/**
 * User data interface for helpers
 */
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  sessionId: string
}

/**
 * Get current authenticated user from server-side
 * Use this in Server Components and API routes
 *
 * @returns User data if authenticated, null otherwise
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (!accessToken) {
      return null
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)

    if (!payload) {
      return null
    }

    // Verify session exists in Redis
    const session = await getSession(payload.sessionId)

    if (!session) {
      return null
    }

    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
      sessionId: payload.sessionId,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 * Useful for conditional logic in Server Components
 *
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * Require authentication
 * Throws error if not authenticated (useful for API routes)
 *
 * @throws Error if not authenticated
 * @returns User data
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized: Authentication required')
  }

  return user
}

/**
 * Require specific role
 * Throws error if user doesn't have the required role
 *
 * @param requiredRole - The role required to access the resource
 * @throws Error if not authenticated or doesn't have required role
 * @returns User data
 */
export async function requireRole(requiredRole: UserRole): Promise<AuthUser> {
  const user = await requireAuth()

  if (user.role !== requiredRole) {
    throw new Error(`Forbidden: ${requiredRole} role required, but user has ${user.role} role`)
  }

  return user
}

/**
 * Require admin role
 * Convenience wrapper for requireRole('admin')
 *
 * @throws Error if not authenticated or not an admin
 * @returns User data
 */
export async function requireAdmin(): Promise<AuthUser> {
  return await requireRole('admin')
}

/**
 * Check if user has specific role
 *
 * @param role - The role to check
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  return user.role === role
}

/**
 * Check if user is admin
 * Convenience wrapper for hasRole('admin')
 *
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  return await hasRole('admin')
}
