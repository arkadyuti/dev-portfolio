# Developer Portfolio

A modern, full-stack portfolio website built with Next.js 15, featuring a blog system, project showcase, and admin dashboard with industry-standard JWT authentication.

## Features

- **Blog System**: Rich text editor (BlockNote), draft/publish states, tag-based categorization, view counter
- **Project Showcase**: Portfolio projects with image galleries and tag filtering
- **Admin Dashboard**: Complete CMS with protected routes for content management
- **JWT Authentication**: Industry-standard auth with Redis sessions, rate limiting, and account lockout protection
- **Image Storage**: MinIO S3-compatible storage for blog/project images
- **SEO Optimized**: Meta tags, Open Graph, structured data, and dynamic sitemap
- **Type-Safe**: Full TypeScript implementation with Zod validation
- **Modern UI**: Tailwind CSS + shadcn/ui components

## Prerequisites

- Node.js 18+ and Yarn
- MongoDB (local or Atlas)
- Redis (for session management)
- MinIO server (or S3-compatible storage)

## Tech Stack

- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.11 + shadcn/ui
- **Database**: MongoDB with Mongoose 8.15.0
- **Sessions**: Redis with IORedis
- **Storage**: MinIO (S3-compatible)
- **Auth**: JWT + Refresh Tokens (jose + jsonwebtoken)
- **State**: TanStack Query v5
- **Validation**: Zod schemas
- **Editor**: BlockNote for rich text

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Required environment variables:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/portfolio

# MinIO
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
MINIO_KEY=your-access-key
MINIO_SECRET=your-secret-key
MINIO_BUCKET=your-bucket-name

# JWT Configuration
JWT_ACCESS_SECRET=generate-with-openssl-rand-base64-32
JWT_REFRESH_SECRET=generate-with-openssl-rand-base64-32

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

Generate JWT secrets:
```bash
openssl rand -base64 32
```

### 3. Create Admin User

```bash
yarn setup-admin
```

Follow the interactive prompts to create the admin user. Password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### 4. Start Development Server

```bash
yarn dev
```

Visit `http://localhost:5005`

### 5. Access Admin Dashboard

- Navigate to `/signin`
- Use your admin credentials created in step 3
- Access admin at `/admin`

## Available Scripts

```bash
yarn dev          # Start dev server (http://localhost:5005)
yarn build        # Production build
yarn serve        # Start production server (http://localhost:3000)
yarn lint         # Lint with auto-fix
yarn setup-admin  # Create admin user (interactive)
yarn analyze      # Bundle size analysis
```

## Project Structure

```
├── app/                    # Next.js App Router pages & API routes
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API endpoints (including auth)
│   ├── blog/              # Blog pages
│   └── projects/          # Projects pages
├── components/            # React components + shadcn/ui
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (mongodb, minio, redis, auth)
├── models/                # Mongoose schemas with Zod
├── scripts/               # Setup scripts (admin creation)
├── middleware.ts          # JWT route protection (Edge compatible)
├── data/                  # Static data & site metadata
└── public/                # Static assets
```

## Authentication

Industry-standard JWT-based authentication with Redis session management:

- **JWT Tokens**: Access tokens (15 min) + Refresh tokens (7 days)
- **Session Storage**: Redis-backed sessions with automatic expiry
- **Route Protection**: `/admin/*` routes protected via Edge-compatible middleware
- **Security Features**:
  - Rate limiting (5 login attempts per 15 min)
  - Account lockout (5 failed attempts → 30 min lock)
  - Password validation (min 8 chars, uppercase, lowercase, number, special char)
  - HTTP-only secure cookies (XSS protection)
  - Session tracking (IP address + user agent)
- **Single Admin User**: Database-enforced single admin (created via setup script)

**How It Works:**

1. User signs in with email/password
2. Password validated with bcrypt, rate limiting checked
3. JWT access + refresh tokens generated
4. Session created in Redis with metadata
5. Tokens stored in HTTP-only cookies
6. Middleware validates JWT on every request to `/admin/*`
7. Sessions can be viewed and revoked via API

See `docs/authentication.md` for full details.

## Database Models

### Blog Schema (`models/blog.ts`)

- Title, slug, content (BlockNote JSON), excerpt
- Cover image (MinIO URL + key)
- Tags, draft status, featured flag, views counter
- SEO fields, reading time, publish date

### Project Schema (`models/project.ts`)

- Title, slug, description
- Cover image, image gallery
- Tags, status (completed/in-progress/planned)
- GitHub/live URLs, featured/draft flags

### Newsletter Schema (`models/newsletter.ts`)

- Email, subscribed status, timestamp

## API Routes

### Authentication

- `POST /api/auth/signin` - Sign in (returns JWT tokens)
- `POST /api/auth/signout` - Sign out (deletes session)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/sessions` - List all active sessions
- `DELETE /api/auth/sessions?sessionId=xxx` - Revoke specific session
- `DELETE /api/auth/sessions?all=true` - Revoke all sessions

### Blog APIs

- `GET /api/blogs` - List all blogs (`?fetchAll=true` for drafts)
- `POST /api/blog` - Create/update blog
- `GET /api/blog/[id]` - Get blog by ID
- `DELETE /api/blog/[id]` - Delete blog
- `POST /api/blog/[id]/views` - Increment view counter

### Project APIs

- `GET /api/projects` - List all projects
- `POST /api/project` - Create/update project
- `GET /api/project/[id]` - Get project by ID
- `DELETE /api/project/[id]` - Delete project

### Utility APIs

- `POST /api/upload` - Upload images to MinIO
- `POST /api/newsletter` - Newsletter subscription
- `GET /api/ping` - Health check

## UI Components

Built with shadcn/ui:

- Button, Input, Textarea, Select
- Dialog, Card, Badge, Separator
- Toast notifications
- Custom BlockNote editor wrapper

## Image Handling

### Upload Flow

1. Upload to temp directory via `/api/upload`
2. Save entity (blog/project) to MongoDB
3. Move image from temp to final location (`blog-images/` or `project-images/`)
4. Clean up old images on update/delete

### MinIO Configuration

- Bucket: Configured via `MINIO_BUCKET`
- Directories: `blog-images/`, `project-images/`, `temp/`
- Public access URLs generated automatically

## SEO Features

- Dynamic meta tags (`app/seo.tsx`)
- Structured data (Person, Website, Article schemas)
- Open Graph & Twitter Cards
- Dynamic sitemap generation (`/sitemap.xml`)
- RSS feed (`/feed.xml`)
- Robots.txt (`/robots.txt`)

## Docker Deployment

### Development

```bash
docker-compose up
```

### Production

```bash
docker build -t portfolio .
docker run -p 3000:3000 --env-file .env portfolio
```

**Important:**

- Container runs as non-root user (`nextjs`, uid 1001)
- Uses Next.js standalone output for minimal image size
- Health check on `/api/ping`
- `.env` not auto-mounted in docker-compose (must pass env vars)

## Security

- **CSP Headers**: Configured in `next.config.js`
- **CSRF Protection**: Security headers enabled
- **Password Hashing**: bcrypt with 10 rounds
- **httpOnly Cookies**: JWT tokens not accessible via JavaScript
- **Rate Limiting**: IP-based brute force protection (Redis-backed)
- **Account Lockout**: Failed login attempt tracking (MongoDB)
- **Input Validation**: Zod schemas on all forms/APIs
- **Image Domain Validation**: Restricted upload domains
- **Session Management**: Redis TTL auto-expiry + manual revocation

## Documentation

Detailed documentation in [`/docs`](./docs):

- [**Authentication**](./docs/authentication.md) - JWT + Redis authentication system
- [**Blog System**](./docs/blog-implementation.md) - Blog architecture and implementation
- [**Projects**](./docs/projects-implementation.md) - Project showcase details
- [**Homepage**](./docs/homepage-implementation.md) - Homepage implementation
- [**Newsletter**](./docs/newsletter-implementation.md) - Newsletter subscription system
- [**View Counter**](./docs/view-counter-implementation.md) - View tracking system
- [**SEO**](./docs/seo-optimization.md) - SEO implementation and optimization
- [**Deployment**](./docs/deployment-guide.md) - Production deployment guide

## Important Notes

1. **Environment Variables**: Restart server after changing `.env` (especially JWT secrets)
2. **Admin User**: Only one admin user allowed (database-enforced). Created via `yarn setup-admin`
3. **Redis Required**: Authentication system requires Redis for session management
4. **JWT Secrets**: Keep JWT secrets secure and never commit them to version control
5. **Session Expiry**: Access tokens expire in 15 minutes, refresh tokens in 7 days
6. **No Tests**: Test framework not configured
7. **Build Warnings**: TypeScript errors ignored in production builds
8. **MinIO Required**: Image uploads require MinIO or S3-compatible service

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [BlockNote](https://www.blocknotejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)
- [MinIO](https://min.io/)
- [jose](https://github.com/panva/jose) - Edge-compatible JWT
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - Node.js JWT
