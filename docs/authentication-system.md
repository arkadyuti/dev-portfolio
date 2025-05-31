# Authentication System Documentation

This document outlines the custom authentication system implementation in the portfolio application.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication Flow](#authentication-flow)
4. [Protected Routes](#protected-routes)
5. [Development vs Production](#development-vs-production)
6. [Security Considerations](#security-considerations)

## Overview

The portfolio application uses a custom authentication system built with React Context API. This provides:

- Simple admin access control
- Session persistence via localStorage
- Protected route functionality
- Development-friendly mock authentication

## Architecture

### Components

1. **AuthContext** (`contexts/AuthContext.tsx`)
   - Global authentication state management
   - Login/logout functionality
   - Session persistence

2. **ProtectedRoute** (`components/ProtectedRoute.tsx`)
   - Route-level access control
   - Automatic redirects for unauthorized users

3. **Sign-in Page** (`app/signin/page.tsx`)
   - User authentication interface
   - Form validation and error handling

### State Management

```typescript
interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}
```

## Authentication Flow

### 1. Initial Load

```typescript
// AuthContext initialization
useEffect(() => {
  const token = localStorage.getItem('auth-token')
  const userData = localStorage.getItem('user-data')
  
  if (token && userData) {
    setIsAuthenticated(true)
    setUser(JSON.parse(userData))
  }
  setLoading(false)
}, [])
```

### 2. Login Process

```typescript
const login = async (email: string, password: string) => {
  try {
    // In development: mock authentication
    if (process.env.NODE_ENV === 'development') {
      const mockUser = { id: '1', email, name: 'Admin User' }
      localStorage.setItem('auth-token', 'mock-token')
      localStorage.setItem('user-data', JSON.stringify(mockUser))
      setUser(mockUser)
      setIsAuthenticated(true)
      return true
    }
    
    // Production: API authentication
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (response.ok) {
      const { token, user } = await response.json()
      localStorage.setItem('auth-token', token)
      localStorage.setItem('user-data', JSON.stringify(user))
      setUser(user)
      setIsAuthenticated(true)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Login error:', error)
    return false
  }
}
```

### 3. Logout Process

```typescript
const logout = () => {
  localStorage.removeItem('auth-token')
  localStorage.removeItem('user-data')
  setUser(null)
  setIsAuthenticated(false)
  router.push('/signin')
}
```

## Protected Routes

### Usage

Wrap any component that requires authentication:

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  )
}
```

### Implementation

```tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/signin?redirect=' + encodeURIComponent(window.location.pathname))
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
```

### Redirect Handling

The system supports redirect URLs after successful authentication:

```typescript
// Sign-in page redirect logic
const handleLogin = async (email: string, password: string) => {
  const success = await login(email, password)
  if (success) {
    const redirectUrl = searchParams.get('redirect') || '/admin'
    router.push(redirectUrl)
  }
}
```

## Development vs Production

### Development Mode

- **Mock Authentication**: Bypasses real credential checking
- **Any Credentials**: Any email/password combination works
- **Quick Access**: Immediate admin access for development

```typescript
// Development authentication
if (process.env.NODE_ENV === 'development') {
  // Accept any credentials
  return mockLogin(email)
}
```

### Production Mode

- **Real Authentication**: Requires valid credentials
- **API Integration**: Uses `/api/auth/login` endpoint
- **Secure Storage**: Proper token management

```typescript
// Production authentication
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})
```

## Security Considerations

### Current Security Measures

1. **Client-Side Storage**: Uses localStorage for session persistence
2. **Route Protection**: Prevents unauthorized access to admin routes
3. **Automatic Logout**: Clears session data on logout

### Recommended Enhancements

1. **HTTP-Only Cookies**: Store tokens in HTTP-only cookies instead of localStorage
2. **Token Expiration**: Implement JWT tokens with expiration
3. **Refresh Tokens**: Add token refresh mechanism
4. **Rate Limiting**: Implement login attempt limits
5. **CSRF Protection**: Add CSRF tokens for form submissions

### Production Implementation Notes

For production deployment, implement:

```typescript
// Secure token storage
const setSecureToken = (token: string) => {
  // Use HTTP-only cookie instead of localStorage
  document.cookie = `auth-token=${token}; HttpOnly; Secure; SameSite=Strict`
}

// Token validation
const validateToken = async (token: string) => {
  try {
    const response = await fetch('/api/auth/validate', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.ok
  } catch {
    return false
  }
}
```

### Environment-Specific Configuration

```typescript
// Auth configuration
const authConfig = {
  development: {
    mockAuth: true,
    tokenExpiry: '24h'
  },
  production: {
    mockAuth: false,
    tokenExpiry: '1h',
    refreshTokenExpiry: '7d'
  }
}
```

## API Endpoints (Production)

When implementing production authentication, create these endpoints:

- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/validate` - Token validation
- `POST /api/auth/refresh` - Token refresh

This system provides a solid foundation for authentication that can be easily extended for production use while maintaining development convenience.