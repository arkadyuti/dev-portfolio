'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import Link from '@/components/ui/Link'
import ProtectedRoute from '@/components/ProtectedRoute'

interface AdminLayoutProps {
  children: React.ReactNode
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuth()

  // Fix the isActive function to correctly determine the active tab
  const isActive = () => {
    if (pathname.includes('/admin/projects')) {
      return 'projects'
    } else if (pathname.includes('/admin/blogs')) {
      return 'blogs'
    } else {
      return 'blogs' // Default tab
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="hidden text-sm md:inline-block">
                Signed in as <span className="font-semibold">{user?.email}</span>
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                Back to site
              </Link>
            </div>
          </div>
        </header>

        <div className="container py-8">
          {isAuthenticated && (
            <Tabs value={isActive()} className="mb-8">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="blogs" asChild>
                  <Link href="/admin/blogs">Blogs</Link>
                </TabsTrigger>
                <TabsTrigger value="projects" asChild>
                  <Link href="/admin/projects">Projects</Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {children}
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default AdminLayout
