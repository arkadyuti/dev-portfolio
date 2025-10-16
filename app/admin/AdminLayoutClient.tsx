'use client'
import { usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import Link from '@/components/ui/Link'
import type { AuthUser } from '@/lib/auth/helpers'

interface AdminLayoutClientProps {
  children: React.ReactNode
  user: AuthUser
}

/**
 * Client Component for interactive admin layout
 * Receives validated user data from server
 */
export default function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const pathname = usePathname()

  // Determine active tab based on pathname
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm md:inline-block">
              Signed in as <span className="font-semibold">{user.email}</span>
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
