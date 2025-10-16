import { AdminGuard } from './AdminGuard'
import AdminLayoutClient from './AdminLayoutClient'

interface AdminLayoutProps {
  children: React.ReactNode
}

/**
 * Server Component Layout
 * Validates session server-side before rendering
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      {(user) => <AdminLayoutClient user={user}>{children}</AdminLayoutClient>}
    </AdminGuard>
  )
}
