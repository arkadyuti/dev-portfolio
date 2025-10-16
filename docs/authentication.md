# Authentication System

## Overview

Industry-standard JWT-based authentication with Redis session management, MongoDB user storage, and comprehensive security features including CSRF protection, timing attack prevention, PII compliance, token reuse detection, and bcrypt DoS protection.

## Architecture

### Two-Layer Security Model

**Layer 1 - Middleware (Edge Runtime):**

- JWT validation only (fast, Edge-compatible)
- Protects `/admin/*` routes at request level
- Uses `jose` library for Edge compatibility

**Layer 2 - AdminGuard (Server Component):**

- Redis session validation during SSR
- MongoDB role revalidation
- Immediate session revocation enforcement
- No extra HTTP roundtrip - happens server-side

### Authentication Flow

1. **Login** (`POST /api/auth/signin`):

   - User submits email/password
   - **Timing attack prevention:** Dummy bcrypt for non-existent users
   - Rate limiting: 5 attempts per 15 minutes per IP (atomic Lua script)
   - Password verified with bcrypt (semaphore-limited to 3 concurrent operations)
   - JWT tokens generated with versioned secrets (no PII - email excluded)
   - Session created in Redis with metadata (IP, user agent)
   - **CSRF protection:** Tokens stored in HTTP-only, secure, sameSite=strict cookies
   - sessionId only in cookie, not response body

2. **Authorization** (Middleware):

   - Edge-compatible JWT verification using `jose` library
   - Validates access token on every request to `/admin/*`
   - Redirects to `/signin` if invalid/missing token
   - **Note:** Redis check happens in AdminGuard (Server Component), not middleware

3. **Server-Side Session Validation** (AdminGuard):

   - Runs during SSR before rendering admin pages
   - Validates Redis session exists
   - Revalidates user role from MongoDB (prevents privilege escalation)
   - Redirects to `/signin` if session revoked or user deleted
   - Passes validated user data to client components

4. **Session Management**:

   - Sessions stored in Redis with auto-expiry (7 days TTL)
   - Redis Sets for O(1) user session lookup (not O(N) KEYS)
   - Sliding window expiry (extends if >50% time passed)
   - Support for viewing and revoking active sessions
   - **Constant-time comparison** for sessionId checks (prevents timing attacks)

5. **Token Refresh** (`POST /api/auth/refresh`):

   - Uses refresh token to get new access token
   - **Session rotation:** New sessionId created, old deleted
   - **Token reuse detection:** Revokes all sessions if refresh token reused
   - Token rotation (new tokens issued with new sessionId)

6. **Logout** (`POST /api/auth/signout`):
   - Deletes session from Redis
   - Clears HTTP-only cookies

### Key Features

**Security (Industry Standard + Advanced):**

- **CSRF Protection:** sameSite=strict cookies
- **Timing Attack Prevention:** Constant-time bcrypt for non-existent users
- **PII Compliance (GDPR):** Email excluded from JWT payload
- **Constant-Time Comparison:** crypto.timingSafeEqual for sessionIds
- **Token Reuse Detection:** Revokes all sessions on refresh token reuse
- **bcrypt DoS Prevention:** Semaphore limits concurrent operations to 3
- **Role Revalidation:** Always fetch fresh role from MongoDB
- **JWT Secret Versioning:** Version field in payload for rotation support
- **Explicit Cookie Domain:** Configurable via COOKIE_DOMAIN env var
- Account lockout after 5 failed login attempts (30 min)
- IP-based rate limiting with atomic Lua scripts (prevents race conditions)
- HTTP-only, secure, sameSite=strict cookies
- Password requirements: min 8 chars, uppercase, lowercase, number, special char
- Session tracking with IP and user agent
- Audit fields (lastLogin, passwordChangedAt)

**Session Management:**

- View all active sessions
- Revoke individual or all sessions
- Automatic session expiry (7 days)
- Sliding window expiry (extends if user active)
- O(1) user session lookup using Redis Sets
- Immediate session revocation via AdminGuard (Server Component)

**Single Admin User:**

- Database-enforced: only one admin allowed
- Created via setup script (`yarn setup-admin`, not in .env)
- Future support for editor/viewer roles

## Key Files

**JWT Libraries (Dual Runtime):**

- `lib/auth/jwt-edge.ts` - JWT verification using `jose` (Edge Runtime: middleware)
- `lib/auth/jwt-node.ts` - JWT generation/verification using `jsonwebtoken` (Node.js: API routes)
  - **Why two libraries?** Middleware runs on Edge Runtime (no Node.js APIs), so we use `jose` (Web Crypto API). API routes run on Node.js where `jsonwebtoken` is available and provides sync methods.

**Auth Utilities:**

- `lib/auth/session.ts` - Redis session CRUD operations with TTL, Sets for O(1) lookup
- `lib/auth/password.ts` - bcrypt hashing with semaphore (max 3 concurrent), password strength validation
- `lib/auth/rate-limit.ts` - IP-based rate limiting using Redis with atomic Lua scripts
- `lib/auth/helpers.ts` - Server-side auth utilities with MongoDB role revalidation
- `lib/auth/crypto-utils.ts` - Constant-time comparison, secure random generation

**Protected Routes:**

- `app/admin/layout.tsx` - Server Component wrapper with AdminGuard
- `app/admin/AdminGuard.tsx` - Server Component for SSR session validation (Redis + MongoDB)
- `app/admin/AdminLayoutClient.tsx` - Client Component for interactive UI

**Infrastructure:**

- `lib/redis.ts` - Singleton Redis client with connection helper (`getConnectedRedisClient()`)
- `models/user.ts` - MongoDB User schema with lockout protection and single admin enforcement
- `middleware.ts` - Edge-compatible JWT verification protecting `/admin/*` routes
- `app/api/auth/signin/route.ts` - Login endpoint with timing attack prevention
- `app/api/auth/signout/route.ts` - Logout endpoint
- `app/api/auth/refresh/route.ts` - Token refresh with session rotation and reuse detection
- `app/api/auth/sessions/route.ts` - Session management (list, revoke) with constant-time comparison
- `app/signin/page.tsx` - Login form UI
- `scripts/setup-admin.ts` - Interactive CLI for creating admin user

## Data Models

### User Model (`models/user.ts`)

```typescript
interface IUser {
  email: string // Unique, lowercase
  passwordHash: string // bcrypt hash (10 rounds)
  name: string
  role: UserRole // 'admin' | 'editor' | 'viewer'
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
  sessionId: string // nanoid(32)
  userId: string
  email: string
  role: UserRole
  userAgent: string
  ipAddress: string
  createdAt: number // Unix timestamp
  expiresAt: number // Unix timestamp
}
```

### JWT Payload

```typescript
interface JWTPayload {
  userId: string
  role: string // Role revalidated from MongoDB on each request
  sessionId: string
  v?: number // Secret version for rotation support
  iat?: number // Issued at (auto-added)
  exp?: number // Expiry (auto-added)
  // NOTE: email excluded for GDPR compliance (PII not in tokens)
}
```

**Token Expiry:**

- Access token: 15 minutes
- Refresh token: 7 days

**Security Notes:**

- Email excluded from JWT (GDPR compliance)
- Role fetched from MongoDB (prevents privilege escalation)
- Version field supports future secret rotation

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
- **Implementation:** Atomic Lua script (prevents race conditions)
- **Response:** 429 status with retry-after header

### Account Lockout

- **Trigger:** 5 consecutive failed login attempts
- **Duration:** 30 minutes (stored in `accountLockedUntil`)
- **Reset:** Automatic after lockout period, or on successful login

### Password Security

- **Hashing:** bcrypt with 10 rounds
- **Validation:** Min 8 chars, uppercase, lowercase, number, special char
- **DoS Prevention:** Semaphore limits concurrent bcrypt operations to 3
- **Timing Attack Prevention:** Dummy bcrypt comparison for non-existent users

### JWT Security

- **Algorithm:** HS256 (HMAC SHA-256)
- **Storage:** HTTP-only, secure, sameSite=strict cookies (XSS + CSRF protection)
- **Dual Runtime:** Split into `jwt-edge.ts` (jose) and `jwt-node.ts` (jsonwebtoken) for Edge/Node.js compatibility
- **Token Rotation:** New refresh token + sessionId issued on each refresh
- **Session Rotation:** New sessionId prevents session fixation
- **Token Reuse Detection:** Revokes all sessions if refresh token reused
- **PII Compliance:** Email excluded from JWT payload (GDPR)
- **Secret Versioning:** Version field in payload for future rotation

### Two-Layer Protection

**Layer 1 - Middleware (Edge Runtime):**

```typescript
// middleware.ts
export const config = {
  matcher: ['/admin/:path*'],
}
```

**Flow:**

1. Extract `accessToken` cookie
2. Verify JWT using `jose` (Edge-compatible)
3. If valid → allow request to AdminGuard
4. If invalid/missing → redirect to `/signin?returnUrl={pathname}`

**Layer 2 - AdminGuard (Server Component):**

**Flow:**

1. Runs during SSR before rendering `/admin/*` pages
2. Calls `getCurrentUser()` which:
   - Verifies JWT
   - Validates Redis session exists
   - Revalidates user role from MongoDB
3. If session revoked or user deleted → redirect to `/signin`
4. If valid → render page with validated user data

**Why two layers?**

- Middleware: Fast JWT check on Edge runtime
- AdminGuard: Thorough validation (Redis + MongoDB) during SSR, no extra API call

## API Endpoints

- `POST /api/auth/signin` - Login (sets cookies, creates session)
- `POST /api/auth/signout` - Logout (deletes session, clears cookies)
- `POST /api/auth/refresh` - Refresh tokens (token rotation)
- `GET /api/auth/sessions` - List all active sessions
- `DELETE /api/auth/sessions?sessionId=xxx` - Revoke specific session
- `DELETE /api/auth/sessions?all=true` - Revoke all sessions

## Environment Variables

```bash
# Required
JWT_ACCESS_SECRET=<random-32-byte-string>  # openssl rand -base64 32
JWT_REFRESH_SECRET=<random-32-byte-string> # openssl rand -base64 32
MONGODB_URI=mongodb://localhost:27017/portfolio
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional
JWT_SECRET_VERSION=1              # For future secret rotation
COOKIE_DOMAIN=example.com         # Explicit cookie domain (undefined = current domain)
REDIS_PASSWORD=<password>         # If Redis requires auth
REDIS_DB=0                        # Redis database number
REDIS_URL=redis://...             # Alternative to host/port
```

## Architecture Notes

**Security Architecture:**

- CSRF: sameSite=strict cookies prevent cross-site attacks
- Timing attacks: Dummy bcrypt for non-existent users maintains constant time
- PII compliance: Email excluded from JWT, fetched from Redis/MongoDB
- Constant-time: crypto.timingSafeEqual prevents timing attacks on sessionIds
- Token reuse: Refresh token reuse detected, revokes all sessions (stolen token protection)
- bcrypt DoS: Semaphore limits 3 concurrent operations (prevents CPU exhaustion)
- Role validation: Always fetch from MongoDB (prevents privilege escalation from stale JWT)
- Secret rotation: Version field in JWT enables future rotation without breaking existing tokens
- Session fixation: New sessionId on refresh prevents fixation attacks
- Performance: Redis Sets for O(1) user session lookup instead of O(N) KEYS scan
- Race conditions: Atomic Lua scripts for rate limiting (prevents double-count)

**Why Two Layers (Middleware + AdminGuard)?**

- Next.js 15 middleware always runs on Edge runtime (no ioredis support)
- Middleware: JWT-only validation (fast, Edge-compatible)
- AdminGuard: Full validation during SSR (Redis + MongoDB, no extra roundtrip)
- Result: Immediate session revocation without API calls

---

**Dependencies:** jose, jsonwebtoken, ioredis, bcryptjs, nanoid, MongoDB/Mongoose

**Last Updated:** 2025-10-16
