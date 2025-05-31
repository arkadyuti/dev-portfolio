# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn serve

# Analyze bundle
yarn analyze

# Lint code
yarn lint
```

## Project Architecture

This is a Next.js-based portfolio website with blog functionality, project showcase, and admin features.

### Key Technologies

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Custom auth system (Context API)
- **Database**: MongoDB (Mongoose)
- **Storage**: MinIO for image uploads
- **State Management**: React Context + React Query

### Core Components

1. **Authentication System**

   - Uses React Context for global auth state
   - Mock authentication in development
   - Protected routes with ProtectedRoute component

2. **Blog System**

   - MongoDB-backed blog posts with tags
   - Admin CRUD operations
   - Zod validation for data integrity
   - Markdown support for content

3. **Project Showcase**

   - Portfolio display for projects
   - Tag-based filtering
   - Image management with MinIO

4. **Admin Dashboard**
   - Protected admin routes under `/admin/*`
   - Content management for blogs and projects
   - Image upload functionality

### Important Files and Their Purpose

- `/contexts/AuthContext.tsx` - Authentication context provider
- `/components/ProtectedRoute.tsx` - Route protection HOC
- `/lib/mongodb.ts` - MongoDB connection management
- `/models/blog.ts` - Blog schema and transformation utilities
- `/lib/minio.ts` - MinIO client for image storage

### Folder Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - Reusable React components
- `/lib` - Utility functions and services
- `/models` - Database models
- `/contexts` - Context providers
- `/hooks` - Custom React hooks
- `/public` - Static assets

### Data Flow

1. **API Routes**

   - `/api/blog` - Blog post management
   - `/api/blogs` - Blog listing and search
   - `/api/tags` - Tag management

2. **Authentication Flow**

   - Login at `/signin`
   - Auth state stored in localStorage
   - Protected routes redirect to login

3. **Content Management**
   - Admin creates/edits content in the admin dashboard
   - MongoDB stores content data
   - MinIO stores image files

## Environment Setup

Required environment variables:

```
# Database
MONGODB_URI=mongodb://localhost:27017/portfolio

# Authentication (for production)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# MinIO (for image storage)
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=your-bucket-name
```

## Code Patterns and Conventions

### Next.js 15 Page Props

In Next.js 15, dynamic route parameters (`params`) and search parameters (`searchParams`) are handled as Promises in server components. Always type and handle them accordingly:

```typescript
// For dynamic routes like [slug]
export default async function PageWithSlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Use slug...
}

// For pages with search parameters
export default async function PageWithSearch({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  // Use params...
}
```

### API Response Format

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

### Form Handling

Forms use React Hook Form with Zod validation:

```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

### Data Fetching

Data fetching uses TanStack React Query (v5):

```typescript
const { data, isLoading, error } = useQuery('posts', fetchPosts)
```

### Authentication

Protected routes use the ProtectedRoute component:

```tsx
<ProtectedRoute>
  <AdminComponent />
</ProtectedRoute>
```

## SEO and Performance

### Meta Tags and Structured Data
The application includes comprehensive SEO implementation in `app/seo.tsx`:

- Open Graph meta tags for social sharing
- Twitter Card meta tags
- Structured data for articles and person profiles
- Dynamic meta generation for blog posts and pages

### Site Configuration
Core site metadata is defined in `data/siteMetadata.js`:

- Site title, description, and social URLs
- Keywords for SEO
- Analytics configuration
- Locale and language settings

### Performance Features
- Next.js Image optimization with remote pattern support
- Font optimization using next/font/google (Inter & Poppins)
- Bundle analysis available via `yarn analyze`
- Security headers configured in next.config.js

## Security

The application implements several security measures:
- Content Security Policy (CSP) headers
- CSRF protection headers
- Image domain validation for uploads
- Protected admin routes with authentication
