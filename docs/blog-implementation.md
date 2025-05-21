# Blog Implementation Documentation

This document outlines the implementation of the Blog feature in the portfolio application.

## Table of Contents

1. [Data Model](#data-model)
2. [API Endpoints](#api-endpoints)
3. [Frontend Components](#frontend-components)
4. [Recent Blog Posts on Homepage](#recent-blog-posts-on-homepage)

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
- `coverImageKey`: Reference to the image in the storage system
- `author`: Author of the blog post
- `slug`: URL-friendly version of the title (auto-generated if not provided)
- `content`: Main content of the blog post
- `tags`: Array of tags associated with the blog post
- `featured`: Boolean indicating if the blog post is featured
- `isDraft`: Boolean indicating if the blog post is a draft or published

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

## Frontend Components

### Blog Page (`app/blog/page.tsx`)

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

### Blog Post Page (`app/blog/[slug]/page.tsx`)

Displays a single blog post.

Features:

- Server-side data fetching from MongoDB
- Markdown rendering
- Related posts section
- Author information

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
    console.error('Error fetching recent blog posts:', error)
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
