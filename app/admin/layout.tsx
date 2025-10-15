'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import Link from '@/components/ui/Link'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface UserData {
  email: string
  name: string
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user data on mount
  useEffect(() => {
    // Check if we have valid cookies by trying to access a protected endpoint
    // The middleware already validated the JWT, so if we're here, we're authenticated
    // We can get user data from the JWT token or make an API call
    // For now, we'll just set loading to false since middleware handles auth
    setLoading(false)
    // You can optionally fetch user details from an API endpoint here
    setUser({ email: 'admin@example.com', name: 'Admin' }) // Placeholder
  }, [])

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

  const handleLogout = async () => {
    try {
      // Call signout API
      await fetch('/api/auth/signout', {
        method: 'POST',
      })
      // Redirect to home
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect anyway
      window.location.href = '/'
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            {user && (
              <span className="hidden text-sm md:inline-block">
                Signed in as <span className="font-semibold">{user.email}</span>
              </span>
            )}
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

        {children}
      </div>
    </div>
  )
}

export default AdminLayout
