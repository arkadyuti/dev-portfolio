'use client'
import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If not loading and not authenticated, redirect to sign-in page
    if (!isLoading && !isAuthenticated) {
      router.push(`/signin`)
    }
  }, [isAuthenticated, isLoading, router, pathname])

  // Show loading state if we're still checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show a loading state (the redirect will happen via useEffect)
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          <p className="text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // If authenticated, render the children
  return <>{children}</>
}

export default ProtectedRoute
