'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from '@/components/ui/Link'
import { logger } from '@/lib/logger'

export const NotFound = () => {
  const pathname = usePathname()

  useEffect(() => {
    logger.error('404 Error: User attempted to access non-existent route', { pathname })
  }, [pathname])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="mb-4 text-7xl font-bold text-primary md:text-9xl">404</h1>
      <p className="mb-8 text-2xl text-muted-foreground">Oops! Page not found</p>
      <Button size="lg" asChild>
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  )
}

export default NotFound
