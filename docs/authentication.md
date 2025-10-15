# Authentication System

## Overview

Industry-standard JWT-based authentication with Redis session management, MongoDB user storage, and comprehensive security features including rate limiting, account lockout, and session management.

## Architecture

### Authentication Flow

1. **Login** (`POST /api/auth/signin`):
   - User submits email/password
   - Rate limiting: 5 attempts per 15 minutes per IP
   - Password verified with bcrypt
   - JWT access token (15 min) + refresh token (7 days) generated
   - Session created in Redis with metadata (IP, user agent)
   - Tokens stored in HTTP-only, secure cookies

2. **Authorization** (Middleware):
   - Edge-compatible JWT verification using `jose` library
   - Validates access token on every request to `/admin/*`
   - Redirects to `/signin` if invalid/missing token

3. **Session Management**:
   - Sessions stored in Redis with auto-expiry (7 days TTL)
   - Server-side validation via `getCurrentUser()` helper
   - Support for viewing and revoking active sessions

4. **Token Refresh** (`POST /api/auth/refresh`):
   - Uses refresh token to get new access token
   - Token rotation (new refresh token issued)
   - Extends session in Redis

5. **Logout** (`POST /api/auth/signout`):
   - Deletes session from Redis
   - Clears HTTP-only cookies

### Key Features

**Security:**
- Account lockout after 5 failed login attempts (30 min)
- IP-based rate limiting (prevents brute force)
- HTTP-only, secure, sameSite cookies (XSS protection)
- Password requirements: min 8 chars, uppercase, lowercase, number, special char
- Session tracking with IP and user agent
- Audit fields (lastLogin, passwordChangedAt)

**Session Management:**
- View all active sessions
- Revoke individual or all sessions
- Automatic session expiry
- Session extends on activity

**Single Admin User:**
- Database-enforced: only one admin allowed
- Created via setup script (`yarn setup-admin`, not in .env)
- Future support for editor/viewer roles

## Key Files

- `lib/auth/jwt.ts` - JWT generation/verification (dual runtime: jose for Edge, jsonwebtoken for Node.js)
- `lib/auth/session.ts` - Redis session CRUD operations with TTL management
- `lib/auth/password.ts` - bcrypt hashing and password strength validation
- `lib/auth/rate-limit.ts` - IP-based rate limiting using Redis
- `lib/auth/helpers.ts` - Server-side auth utilities (`getCurrentUser()`, `requireAuth()`, `requireAdmin()`)
- `lib/redis.ts` - Singleton Redis client with lazy connection
- `models/user.ts` - MongoDB User schema with lockout protection and single admin enforcement
- `middleware.ts` - Edge-compatible JWT verification protecting `/admin/*` routes
- `app/api/auth/signin/route.ts` - Login endpoint with rate limiting
- `app/api/auth/signout/route.ts` - Logout endpoint
- `app/api/auth/refresh/route.ts` - Token refresh endpoint with token rotation
- `app/api/auth/sessions/route.ts` - Session management (list, revoke)
- `app/signin/page.tsx` - Login form UI
- `scripts/setup-admin.ts` - Interactive CLI for creating admin user

## Data Models

### User Model (`models/user.ts`)

```typescript
interface IUser {
  email: string           // Unique, lowercase
  passwordHash: string    // bcrypt hash (10 rounds)
  name: string
  role: UserRole          // 'admin' | 'editor' | 'viewer'
  failedLoginAttempts: number
  accountLockedUntil?: Date
  lastLogin?: Date
  passwordChangedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

**Methods:**
- `incrementFailedAttempts()` - Track failed login, lock account after 5 attempts (30 min)
- `resetFailedAttempts()` - Clear failed attempts on successful login
- `isLocked()` - Check if account is currently locked

**Hooks:**
- Pre-save: Enforce single admin user constraint (throws if >1 admin)

### Session Data (Redis)

Key: `session:{sessionId}`, Value: JSON string, TTL: 7 days

```typescript
interface SessionData {
  sessionId: string       // nanoid(32)
  userId: string
  email: string
  role: UserRole
  userAgent: string
  ipAddress: string
  createdAt: number       // Unix timestamp
  expiresAt: number       // Unix timestamp
}
```

### JWT Payload

```typescript
interface JWTPayload {
  userId: string
  email: string
  role: string
  sessionId: string
  iat?: number            // Issued at (auto-added)
  exp?: number            // Expiry (auto-added)
}
```

**Token Expiry:**
- Access token: 15 minutes
- Refresh token: 7 days

## Server-Side Auth Helpers

```typescript
import { getCurrentUser, requireAuth, requireAdmin, isAdmin } from '@/lib/auth/helpers'

// Get current user (returns null if not authenticated)
const user = await getCurrentUser()
// Returns: { id, email, role, sessionId } | null

// Require authentication (throws if not authenticated)
const user = await requireAuth()

// Require admin role (throws if not admin)
const admin = await requireAdmin()

// Check if user is admin
const adminCheck = await isAdmin() // Returns: boolean
```

## Security Implementation

### Rate Limiting
- **Storage:** Redis key `rate-limit:login:{ipAddress}`, TTL: 15 minutes
- **Limit:** 5 login attempts per 15 minutes per IP
- **Response:** 429 status with retry-after header

### Account Lockout
- **Trigger:** 5 consecutive failed login attempts
- **Duration:** 30 minutes (stored in `accountLockedUntil`)
- **Reset:** Automatic after lockout period, or on successful login

### Password Security
- **Hashing:** bcrypt with 10 rounds
- **Validation:** Min 8 chars, uppercase, lowercase, number, special char

### JWT Security
- **Algorithm:** HS256 (HMAC SHA-256)
- **Storage:** HTTP-only cookies (XSS protection)
- **Dual Runtime:** `jose` for Edge (middleware), `jsonwebtoken` for Node.js (API routes)
- **Token Rotation:** New refresh token issued on each refresh

### Middleware Protection

```typescript
// middleware.ts
export const config = {
  matcher: ['/admin/:path*']
}
```

**Flow:**
1. Extract `accessToken` cookie
2. Verify JWT using `jose` (Edge-compatible)
3. If valid → allow request
4. If invalid/missing → redirect to `/signin?returnUrl={pathname}`

## API Endpoints

- `POST /api/auth/signin` - Login (sets cookies, creates session)
- `POST /api/auth/signout` - Logout (deletes session, clears cookies)
- `POST /api/auth/refresh` - Refresh tokens (token rotation)
- `GET /api/auth/sessions` - List all active sessions
- `DELETE /api/auth/sessions?sessionId=xxx` - Revoke specific session
- `DELETE /api/auth/sessions?all=true` - Revoke all sessions

---

**Dependencies:** jose, jsonwebtoken, ioredis, bcryptjs, nanoid, MongoDB/Mongoose
**Last Updated:** 2025-01-15
