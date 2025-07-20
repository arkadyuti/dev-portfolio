# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Install dependencies
yarn install

# Start development server (http://localhost:3000)
yarn dev

# Build for production (disables TypeScript errors in build)
yarn build

# Start production server
yarn serve

# Analyze bundle size
yarn analyze

# Lint code with auto-fix
yarn lint

# Type checking (manual - not included in build)
yarn typecheck
```

## Project Architecture

This is a Next.js 15.2.4 portfolio website with blog functionality, project showcase, and admin features using App Router architecture.

### Key Technologies

- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.11 + shadcn/ui components
- **Authentication**: Custom React Context (mock auth in dev)
- **Database**: MongoDB with Mongoose 8.15.0
- **Storage**: MinIO for S3-compatible image uploads
- **State Management**: React Context + TanStack Query v5
- **Validation**: Zod schemas throughout
- **Rich Text Editor**: BlockNote for blog content

### Core Features

1. **Authentication System**
   - Mock authentication in development (admin@example.com/password)
   - React Context-based auth state management
   - Protected routes via ProtectedRoute component
   - Session persistence in localStorage

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

#### Database Models
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
- `/contexts` - React Context providers (AuthContext)
- `/models` - Mongoose schemas with Zod validation
- `/lib` - Utilities (mongodb.ts, minio.ts, logger.ts)
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
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=your-bucket-name

# Production Auth (currently unused)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### Security Features

- Comprehensive CSP headers in next.config.js
- CSRF protection headers
- Image domain validation for uploads
- Input validation with Zod schemas
- Non-root user in Docker container

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

- No test framework configured
- TypeScript strict mode is disabled
- Build process skips TypeScript errors (`ignoreBuildErrors: true`)
- Uses yarn as package manager
- Docker multi-stage build for production
- Mock authentication only - no real auth provider implemented