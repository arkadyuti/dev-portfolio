import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/helpers'
import type { AuthUser } from '@/lib/auth/helpers'

/**
 * Server Component that validates session with Redis check
 * Redirects to signin if session is invalid
 *
 * This runs on the server during SSR, so Redis validation happens
 * before any HTML is sent to the browser - no extra API roundtrip needed
 */
export async function AdminGuard({ children }: { children: (user: AuthUser) => React.ReactNode }) {
  // Validate session (includes JWT + Redis + MongoDB role revalidation)
  const user = await getCurrentUser()

  if (!user) {
    // Session invalid (Redis check failed), redirect to signin
    redirect('/signin?returnUrl=/admin/blogs')
  }

  // Session valid, render children with user data
  return <>{children(user)}</>
}
