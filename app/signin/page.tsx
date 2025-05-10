'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

const formSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormValues = z.infer<typeof formSchema>

// Create a separate component that uses useSearchParams
function SignInContent() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Import useSearchParams inside the component that's wrapped with Suspense
  const { useSearchParams } = require('next/navigation')
  const searchParams = useSearchParams()

  // Get the return URL from search params (if any)
  const returnUrl = searchParams.get('returnUrl') || '/admin/blogs'

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Handle redirection if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(returnUrl)
    }
  }, [isAuthenticated, isLoading, router, returnUrl])

  const onSubmit = async (values: FormValues) => {
    try {
      const success = await login(values.email, values.password)

      if (!success) {
        toast.error('Invalid email or password')
        form.setError('email', { message: ' ' })
        form.setError('password', { message: 'Invalid credentials' })
      } else {
        toast.success('Successfully logged in')
        // In Next.js, we handle redirects after successful login here
        router.push(returnUrl)
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An error occurred during login')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Admin Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access the admin dashboard
          </p>
          <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p>Demo credentials:</p>
            <p>Email: admin@example.com</p>
            <p>Password: password</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="admin@example.com" className="pl-10" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10 px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">Toggle password visibility</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}

// Loading component to show while content is loading
function SignInLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-md">
        <div className="animate-pulse text-center">
          <div className="mx-auto h-8 w-48 rounded bg-muted"></div>
          <div className="mt-4 h-4 w-36 rounded bg-muted"></div>
          <div className="mt-6 h-20 rounded bg-muted"></div>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-muted"></div>
            <div className="h-10 rounded bg-muted"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-muted"></div>
            <div className="h-10 rounded bg-muted"></div>
          </div>
          <div className="h-10 rounded bg-muted"></div>
        </div>
      </div>
    </div>
  )
}

// Main page component
const SignInPage = () => {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  )
}

export default SignInPage