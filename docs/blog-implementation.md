# Blog Implementation Documentation

This document outlines the complete implementation of the Blog feature in the portfolio application, including image handling, data models, API endpoints, and frontend components.

## Table of Contents

1. [Data Model](#data-model)
2. [API Endpoints](#api-endpoints)
3. [Frontend Components](#frontend-components)
4. [Image Handling](#image-handling)
5. [Blog Editor Implementation](#blog-editor-implementation)
6. [Recent Blog Posts on Homepage](#recent-blog-posts-on-homepage)

## Data Model

The blog data is stored in MongoDB using the following schema (defined in `models/blog.ts`):

```typescript
interface IBlog {
  id: string
  publishedAt: number
  title: string
  excerpt: string
  coverImage: string
  coverImageKey?: string
  author: string
  slug: string
  content: string
  contentRTE: unknown
  contentImages: string[]
  tags: Tag[]
  featured: boolean
  isDraft?: boolean
}
```

Key fields:

- `id`: Unique identifier for the blog post
- `publishedAt`: Timestamp when the blog was published
- `title`: Blog post title
- `excerpt`: Short summary of the blog post
- `coverImage`: URL to the blog's main image
- `coverImageKey`: Reference to the image in MinIO storage
- `author`: Author of the blog post
- `slug`: URL-friendly version of the title (auto-generated)
- `content`: Main content of the blog post
- `contentRTE`: Rich text editor data
- `contentImages`: Array of image URLs used in the content
- `tags`: Array of tags associated with the blog post
- `featured`: Boolean indicating if the blog post is featured
- `isDraft`: Boolean indicating if the blog post is a draft
- `views`: Number of unique views for the blog post (see [View Counter Implementation](./view-counter-implementation.md))

## API Endpoints

### GET /api/blogs

Retrieves a list of blog posts with pagination.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 10)
- `fetchAll`: When set to "true", includes draft posts (admin only)

**Response:**

```json
{
  "success": true,
  "data": [Blog],
  "pagination": {
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number
  }
}
```

### GET /api/blog/[slug]

Retrieves a specific blog post by its slug.

**Path Parameters:**

- `slug`: The slug of the blog post to retrieve

**Response:**

```json
{
  "success": true,
  "data": Blog
}
```

### POST /api/blog

Creates or updates a blog post.

**Request Body (FormData):**

- `title`: Blog post title
- `author`: Author name
- `excerpt`: Blog excerpt
- `content`: Blog content
- `contentRTE`: Rich text editor data
- `contentImages`: Array of image URLs
- `coverImage`: Cover image file
- `tags`: Array of tags
- `featured`: Boolean
- `isDraft`: Boolean

### DELETE /api/blog/[id]

Deletes a blog post and its associated images.

**Path Parameters:**

- `id`: The ID of the blog post to delete

## Frontend Components

### Blog Page (`app/blogs/page.tsx`)

Displays a list of published blog posts from the database with pagination.

Features:

- Server-side data fetching from MongoDB
- Pagination
- Responsive grid layout for blog cards
- Displays blog information including:
  - Cover image
  - Title
  - Excerpt
  - Publication date
  - Tags

### Blog Post Page (`app/blogs/[slug]/page.tsx`)

Displays a single blog post.

Features:

- Server-side data fetching from MongoDB
- Rich text content rendering
- Related posts section
- Author information
- Reading time calculation
- View counter with unique tracking
- Social sharing buttons

### Admin Blog Editor (`app/admin/blogs/new/page.tsx`)

Provides a rich text editor for creating and editing blog posts.

Features:

- Rich text editing with BlockNoteEditor
- Image upload and management
- Tag management
- Draft/publish functionality
- Cover image upload

## Image Handling

### Image Upload Process

1. When a user adds an image in the editor:
   - The image is uploaded to `/api/blog-content-image`
   - The uploaded image URL is returned
   - The URL is passed to the editor for display
   - The URL is tracked via `onImageUpload` callback

### State Management

The blog form maintains editor state using `editorRef`:

```typescript
const editorRef = useRef<{
  contentRTE: any // Rich text editor content
  contentImages: string[] // List of uploaded image URLs
  content: string // HTML content
}>({
  contentRTE: null,
  contentImages: [],
  content: '',
})
```

### Image Storage

- Images are stored in MinIO
- Each image gets a unique key
- Public URLs are generated for display
- Image cleanup is handled on blog deletion

## Blog Editor Implementation

### BlockNoteEditor Component

Located at `components/BlockNoteEditor/BlockNoteEditor.tsx`

Key features:

- Rich text editing with image support
- Image upload functionality
- Content tracking through callbacks

```typescript
interface BlockNoteEditorLocalProps {
  onDataChange: (blocks: Block[], html: string) => void
  initialContent?: PartialBlock[] | undefined
  onImageUpload?: (imageUrl: string) => void
}
```

### Form Submission

When the form is submitted:

1. All form data is collected into FormData
2. Editor content and images are included:
   ```typescript
   formData.append('contentRTE', JSON.stringify(editorRef.current.contentRTE))
   formData.append('content', editorRef.current.content)
   formData.append('contentImages', JSON.stringify(editorRef.current.contentImages))
   ```
3. The complete data is sent to the server for processing

## Recent Blog Posts on Homepage

The homepage displays the 3 most recent blog posts from the database:

```typescript
// Server-side data fetching for recent blog posts
async function getRecentBlogPosts() {
  try {
    await connectToDatabase()
    const blogs = await BlogModels.find({ isDraft: false })
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean()

    return transformToBlogs(blogs)
  } catch (error) {
    logger.error('Error fetching recent blog posts:', error)
    return []
  }
}
```

Implementation details:

- Uses server-side data fetching with MongoDB
- Filters out draft posts
- Sorts by publication date (newest first)
- Limits to 3 posts
- Transforms MongoDB documents to blog objects using the blog schema
