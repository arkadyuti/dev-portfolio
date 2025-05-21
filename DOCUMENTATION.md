# Portfolio Project Documentation

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

## Project Overview

This is a Next.js-based portfolio website that includes blog functionality, project showcase, and admin features. The project uses TypeScript, Tailwind CSS for styling, and follows modern web development practices.

## Tech Stack

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Custom authentication system
- **Database**: MongoDB (based on the models directory structure)
- **Package Manager**: Yarn
- **Code Quality**: ESLint, Prettier, Husky

## Project Structure

### Core Directories

#### `/app`

The main application directory following Next.js 13+ App Router structure:

- `/api` - API routes for blog and tags
- `/blog` - Blog-related pages
- `/projects` - Project showcase pages
- `/admin` - Admin dashboard
- `/about` - About page
- `/search` - Search functionality
- `/signin` - Authentication page

#### `/components`

Reusable React components:

- `/admin` - Admin-specific components
- `/ui` - UI components
- `header.tsx` - Main navigation header
- `footer.tsx` - Site footer
- `theme-toggle.tsx` - Dark/light mode toggle
- `theme-provider.tsx` - Theme context provider
- `ProtectedRoute.tsx` - Authentication wrapper component

#### `/models`

Database models (MongoDB schemas)

#### `/lib`

Utility libraries and shared code

#### `/utils`

Helper functions and utilities

#### `/contexts`

React context providers

#### `/hooks`

Custom React hooks

#### `/public`

Static assets

### Key Features

1. **Blog System**

   - Blog post creation and management
   - Tag-based categorization
   - Search functionality
   - SEO optimization

2. **Project Showcase**

   - Project portfolio display
   - Project details and descriptions
   - Technology stack showcase

3. **Admin Dashboard**

   - Protected admin routes
   - Content management
   - Blog post management
   - Project management

4. **Authentication**

   - Custom authentication system
   - Protected routes
   - User session management

5. **Theme Support**
   - Dark/Light mode
   - Theme persistence
   - Smooth theme transitions

### API Routes

#### Blog API

- `/api/blog` - Blog post management
- `/api/blogs` - Blog listing and search
- `/api/tags` - Tag management

### Configuration Files

- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `prettier.config.js` - Prettier configuration

### Development Tools

- **Git Hooks**: Husky for pre-commit hooks
- **Code Formatting**: Prettier
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Containerization**: Docker support (docker-compose.yml)

## Getting Started

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Set up environment variables (create .env.local file)

3. Run development server:

   ```bash
   yarn dev
   ```

4. Build for production:
   ```bash
   yarn build
   ```

## Best Practices

1. **Code Organization**

   - Components are organized by feature/functionality
   - Shared components are placed in the UI directory
   - API routes follow RESTful conventions

2. **Type Safety**

   - TypeScript is used throughout the project
   - Proper type definitions for all components and functions

3. **Styling**

   - Tailwind CSS for consistent styling
   - Responsive design patterns
   - Dark/light mode support

4. **Performance**
   - Next.js App Router for optimized routing
   - Image optimization
   - SEO best practices

## Security

1. **Authentication**

   - Protected routes for admin access
   - Secure session management
   - API route protection

2. **Data Validation**
   - Input validation on forms
   - API request validation
   - Type checking with TypeScript

## Deployment

The project can be deployed using:

- Docker containers
- Vercel (recommended for Next.js)
- Any Node.js hosting platform

## Contributing

1. Follow the established code style
2. Use TypeScript for all new code
3. Write meaningful commit messages
4. Test changes thoroughly
5. Update documentation as needed

## Data Structures and Models

### Blog Post Structure

```typescript
interface BlogPost {
  _id: string
  title: string
  slug: string
  content: string
  excerpt: string
  coverImage: string
  tags: string[]
  author: {
    name: string
    image: string
  }
  publishedAt: Date
  updatedAt: Date
  status: 'draft' | 'published'
  readingTime: number
  views: number
}
```

### Project Structure

```typescript
interface Project {
  _id: string
  title: string
  slug: string
  description: string
  content: string
  coverImage: string
  technologies: string[]
  githubUrl?: string
  liveUrl?: string
  featured: boolean
  startDate: Date
  endDate?: Date
  status: 'completed' | 'in-progress' | 'planned'
}
```

### Tag Structure

```typescript
interface Tag {
  _id: string
  name: string
  slug: string
  description?: string
  count: number
}
```

## Coding Standards

### TypeScript Standards

1. **Type Definitions**

   - Use interfaces for object shapes
   - Use type aliases for unions and intersections
   - Export types/interfaces that are used across files
   - Use strict null checks
   - Avoid using `any` type

2. **Component Props**
   - Define prop interfaces with clear names
   - Use required/optional props appropriately
   - Document complex props with JSDoc comments
   ```typescript
   interface ButtonProps {
     variant: 'primary' | 'secondary' | 'outline'
     size: 'sm' | 'md' | 'lg'
     onClick?: () => void
     children: React.ReactNode
   }
   ```

### React Standards

1. **Component Structure**

   - Use functional components with hooks
   - Keep components focused and single-responsibility
   - Extract reusable logic into custom hooks
   - Use proper naming conventions:
     - Components: PascalCase (e.g., `BlogCard.tsx`)
     - Hooks: camelCase with 'use' prefix (e.g., `useAuth.ts`)
     - Utils: camelCase (e.g., `formatDate.ts`)

2. **State Management**
   - Use React Context for global state
   - Use local state for component-specific state
   - Implement proper loading and error states
   ```typescript
   const [isLoading, setIsLoading] = useState(false)
   const [error, setError] = useState<Error | null>(null)
   const [data, setData] = useState<T | null>(null)
   ```

### API Standards

1. **Route Handlers**

   - Use proper HTTP methods (GET, POST, PUT, DELETE)
   - Implement proper error handling
   - Return consistent response formats

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

2. **Error Handling**
   - Use try-catch blocks for async operations
   - Implement proper error boundaries
   - Log errors appropriately
   ```typescript
   try {
     const response = await fetch('/api/data')
     if (!response.ok) throw new Error('API Error')
     const data = await response.json()
     return { success: true, data }
   } catch (error) {
     console.error('API Error:', error)
     return { success: false, error: { message: 'Failed to fetch data' } }
   }
   ```

### Styling Standards

1. **Tailwind CSS**

   - Use consistent class ordering
   - Extract common patterns into components
   - Use proper responsive design classes

   ```typescript
   // Good
   <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800">

   // Bad
   <div className="bg-white p-4 flex justify-between items-center dark:bg-gray-800">
   ```

2. **Custom Components**
   - Use shadcn/ui components as base
   - Follow consistent theming
   - Implement proper dark mode support

### Testing Standards

1. **Unit Tests**

   - Test individual components
   - Test utility functions
   - Use proper mocking

   ```typescript
   describe('formatDate', () => {
     it('should format date correctly', () => {
       const date = new Date('2024-01-01')
       expect(formatDate(date)).toBe('January 1, 2024')
     })
   })
   ```

2. **Integration Tests**
   - Test component interactions
   - Test API integrations
   - Test user flows

## Environment Variables

Required environment variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/portfolio

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# API Keys (if needed)
GITHUB_TOKEN=your-github-token
```

## Common Patterns

### Data Fetching

```typescript
// Using SWR for data fetching
const { data, error, isLoading } = useSWR('/api/posts', fetcher)

// Using React Query
const { data, isLoading, error } = useQuery('posts', fetchPosts)
```

### Form Handling

```typescript
// Using React Hook Form
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormData>()

// Form validation
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
```

### Authentication

```typescript
// Protected API route
export default withAuth(async function handler(req, res) {
  // Your API logic here
});

// Protected component
export default function ProtectedPage() {
  const { data: session } = useSession();
  if (!session) return <SignIn />;
  return <YourComponent />;
}
```

## Performance Optimization

### Image Optimization

```typescript
// Using Next.js Image component
import Image from 'next/image';

<Image
  src="/images/photo.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={true}
  className="rounded-lg"
/>
```

### Code Splitting

```typescript
// Dynamic imports
const DynamicComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
```

### Caching Strategies

```typescript
// API route caching
export const config = {
  runtime: 'edge',
  regions: ['us-east-1'],
}

// Static page generation
export async function getStaticProps() {
  return {
    props: {
      data: await fetchData(),
    },
    revalidate: 60, // Revalidate every minute
  }
}
```
