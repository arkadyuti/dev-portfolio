# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Install dependencies
yarn install

# Start development server (http://localhost:5005)
yarn dev

# Build for production (disables TypeScript errors in build)
yarn build

# Start production server
yarn serve

# Analyze bundle size
yarn analyze

# Lint code with auto-fix
yarn lint

# Create admin user (interactive)
yarn setup-admin
```

## Project Architecture

This is a Next.js 15.2.4 portfolio website with blog functionality, project showcase, and admin features using App Router architecture.

### Key Technologies

- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.11 + shadcn/ui components
- **Authentication**: JWT + Refresh Tokens with Redis sessions
- **Database**: MongoDB with Mongoose 8.15.0
- **Session Storage**: Redis with IORedis
- **Storage**: MinIO for S3-compatible image uploads
- **State Management**: TanStack Query v5
- **Validation**: Zod schemas throughout
- **Rich Text Editor**: BlockNote for blog content

### Core Features

1. **Authentication System**
   - JWT access tokens (15 min) + refresh tokens (7 days)
   - Redis-backed session management with auto-expiry
   - Rate limiting (5 login attempts per 15 min, Redis-backed)
   - Account lockout (5 failed attempts → 30 min lock, MongoDB tracking)
   - Password validation (min 8 chars, uppercase, lowercase, number, special char)
   - Single admin user (database-enforced, created via `yarn setup-admin`)
   - Edge-compatible middleware using `jose` library for JWT verification
   - HTTP-only secure cookies for token storage

2. **Blog System**
   - Full CRUD operations with draft/publish states
   - Tag-based categorization
   - BlockNote rich text editor integration
   - SEO-friendly slug generation with collision handling
   - Search and filtering capabilities

3. **Project Portfolio**
   - Project showcase with image galleries
   - Tag-based filtering
   - MinIO integration for image storage

4. **Admin Dashboard**
   - Protected routes under `/admin/*`
   - Content management interface
   - Image upload with temp → final location workflow

### Important Implementation Details

#### Next.js 15 Async Parameters
Dynamic route and search parameters are Promises in Next.js 15:

```typescript
// Dynamic routes
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Use slug...
}

// Search parameters
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  // Use params...
}
```

#### Authentication Architecture
- **JWT Generation**: `lib/auth/jwt.ts` - Dual runtime support (jose for Edge, jsonwebtoken for Node.js)
- **Session Management**: `lib/auth/session.ts` - Redis CRUD operations with TTL
- **Rate Limiting**: `lib/auth/rate-limit.ts` - IP-based brute force protection
- **Password Utilities**: `lib/auth/password.ts` - bcrypt hashing and validation
- **Auth Helpers**: `lib/auth/helpers.ts` - Server-side auth utilities for components/APIs
- **Middleware**: `middleware.ts` - Edge-compatible JWT verification protecting `/admin/*`

#### Database Models
- **User**: `/models/user.ts` - Admin user with lockout protection, single admin enforcement
- **Blog**: `/models/blog.ts` - Includes transform utilities for Mongoose → TypeScript
- **Project**: `/models/project.ts` - Portfolio projects with image galleries
- **Newsletter**: `/models/newsletter.ts` - Subscriber management

#### API Response Pattern
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
  }
}
```

#### Image Upload Flow
1. Upload to temp directory via `/api/upload`
2. Save entity to database
3. Move image from temp to final location
4. Update entity with final image URL

#### Form Handling Pattern
```typescript
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

### File Structure

- `/app` - Next.js pages, API routes, layouts
- `/components` - UI components and shadcn/ui library
- `/models` - Mongoose schemas with Zod validation (User, Blog, Project, Newsletter)
- `/lib` - Utilities (mongodb.ts, minio.ts, redis.ts, auth/*)
- `/lib/auth` - Authentication utilities (jwt.ts, session.ts, password.ts, rate-limit.ts, helpers.ts)
- `/scripts` - Setup scripts (setup-admin.ts for creating admin user)
- `/hooks` - Custom React hooks
- `/data` - Static data and site metadata
- `/public` - Static assets

### Environment Variables

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/portfolio

# MinIO Configuration
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
MINIO_KEY=your-access-key
MINIO_SECRET=your-secret-key
MINIO_IMAGE_BUCKET=your-bucket-name

# JWT Configuration (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-random-access-secret
JWT_REFRESH_SECRET=your-random-refresh-secret

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# Optional: REDIS_PASSWORD, REDIS_DB
```

### Security Features

- **CSP Headers**: Comprehensive security headers in next.config.js
- **CSRF Protection**: Security headers enabled
- **Password Security**: bcrypt hashing (10 rounds), strength validation
- **Rate Limiting**: IP-based brute force protection (Redis-backed)
- **Account Lockout**: Failed login tracking (MongoDB)
- **HTTP-only Cookies**: JWT tokens not accessible via JavaScript
- **Input Validation**: Zod schemas on all forms/APIs
- **Image Domain Validation**: Restricted upload domains
- **Session Management**: Redis TTL auto-expiry + manual revocation
- **Edge Runtime**: JWT verification compatible with Next.js Edge middleware
- **Non-root Docker**: Container runs as user `nextjs` (uid 1001)

### SEO Implementation

- Dynamic meta tags in `app/seo.tsx`
- Structured data for articles and person profiles
- Open Graph and Twitter Card support
- Site metadata in `data/siteMetadata.js`
- Sitemap generation at `/sitemap.xml`

### Performance Optimizations

- Next.js Image component with remote patterns
- Font optimization (Inter & Poppins via next/font)
- Standalone Next.js output in Docker
- React Query for efficient data fetching

### Development Notes

- **Package Manager**: Yarn (v3.6.1)
- **TypeScript**: Strict mode disabled, build ignores errors (`ignoreBuildErrors: true`)
- **Testing**: No test framework configured
- **Docker**: Multi-stage build for production with standalone Next.js output
- **Dev Server**: Runs on port 5005 (production on 3000)
- **Admin Setup**: Single admin user created via `yarn setup-admin` script (not in .env)
- **JWT Libraries**: `jose` for Edge runtime (middleware), `jsonwebtoken` for Node.js (API routes)