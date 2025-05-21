# Homepage Implementation Documentation

This document outlines the implementation of the Homepage in the portfolio application, particularly focusing on the dynamic content sections.

## Table of Contents

1. [Overview](#overview)
2. [Featured Projects Section](#featured-projects-section)
3. [Recent Blog Posts Section](#recent-blog-posts-section)
4. [Server-Side Data Fetching](#server-side-data-fetching)

## Overview

The homepage (`app/page.tsx`) serves as the main entry point for the portfolio website. It includes several sections:

1. Hero section with personal introduction
2. Tech stack showcase
3. Featured projects from the database
4. Recent blog posts from the database
5. Contact CTA section

The page is built as a Next.js Server Component, enabling server-side data fetching for optimal performance and SEO.

## Featured Projects Section

The homepage displays featured projects fetched directly from the MongoDB database:

```typescript
// Server-side data fetching
async function getFeaturedProjects() {
  try {
    await connectToDatabase()
    const projects = await ProjectModels.find({ featured: true, isDraft: false })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean()

    return transformToProjects(projects)
  } catch (error) {
    console.error('Error fetching featured projects:', error)
    return []
  }
}
```

Implementation details:

- Uses server-side data fetching with MongoDB
- Filters for projects marked as featured (`featured: true`)
- Excludes draft projects (`isDraft: false`)
- Sorts by creation date (newest first)
- Limits to 4 projects maximum
- Transforms MongoDB documents to project objects using the project schema

Each project card displays:

- Project cover image
- Title
- Description
- Top 3 tags (with a +X indicator if more exist)
- Links to live demo and source code (if available)

## Recent Blog Posts Section

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
- Filters out draft posts (`isDraft: false`)
- Sorts by publication date (newest first)
- Limits to 3 posts
- Transforms MongoDB documents to blog objects using the blog schema

Each blog card displays:

- Cover image
- Publication date
- Title
- Excerpt (limited to 2 lines)
- Up to 2 tags

## Server-Side Data Fetching

The homepage implements server-side data fetching using Next.js Server Components:

```typescript
// Explicitly mark page as server component
export const dynamic = 'force-dynamic'

export default async function Home() {
  const featuredProjects = await getFeaturedProjects()
  const recentPosts = await getRecentBlogPosts()

  // Render the page with the fetched data
  return (
    // ... JSX with featuredProjects and recentPosts
  )
}
```

Benefits of this approach:

1. **Performance**: Data is fetched on the server before sending HTML to the client
2. **SEO**: Search engines receive fully rendered content
3. **Reduced Client-Side JavaScript**: No need for client-side data fetching
4. **Improved Initial Page Load**: Content is available immediately without loading states
5. **Error Handling**: Server-side errors are gracefully handled before reaching the client
