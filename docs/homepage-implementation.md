# Homepage

## Overview

Server-rendered homepage with dynamic content sections: hero, tech stack, featured projects, recent blog posts, and contact CTA. Uses Next.js Server Components for optimal performance and SEO.

## Architecture

### Data Flow

1. Page loads → Server fetches featured projects + recent blogs from MongoDB
2. HTML rendered server-side with data
3. Client receives fully populated page
4. No client-side loading states needed

### Key Files

- `app/page.tsx` - Homepage Server Component
- Uses `ProjectModels` and `BlogModels` for data fetching
- `data/profile-data.ts` - Profile and skills data

## Sections

### 1. Hero Section

- Profile name, title, bio
- Profile image with gradient background
- CTA buttons to projects and about pages
- Structured data (Person + Website schemas)

### 2. Tech Stack

- Top 15 skills from profile data (3 per category)
- Responsive grid layout
- Link to full skills list on about page

### 3. Featured Projects

Server-fetched from MongoDB:

```typescript
ProjectModels.find({ featured: true, isDraft: false }).sort({ createdAt: -1 }).limit(4)
```

Each card displays:

- Cover image
- Title, description
- Top 3 tags (+X indicator if more)
- Live demo + source code links

### 4. Recent Blog Posts

Server-fetched from MongoDB:

```typescript
BlogModels.find({ isDraft: false }).sort({ publishedAt: -1 }).limit(3)
```

Each card displays:

- Cover image
- Publication date + view count
- Title, excerpt (2 lines max)
- Up to 2 tags

### 5. Contact CTA

- Call-to-action section
- Email link to profile contact

## Server-Side Rendering

```typescript
export const dynamic = 'force-dynamic'

export default async function Home() {
  const featuredProjects = await getFeaturedProjects()
  const recentPosts = await getRecentBlogPosts()
  // Render with data
}
```

### Benefits

- **SEO**: Fully rendered content for search engines
- **Performance**: No client-side fetch delays
- **UX**: Instant content display
- **Error handling**: Server-side graceful fallbacks

## SEO Features

- Dynamic metadata with profile info
- Person structured data (JSON-LD)
- Website structured data (JSON-LD)
- Priority image loading for hero
- Lazy loading for project/blog images

---

**Dependencies**: Next.js Server Components, MongoDB/Mongoose
**Last Updated**: 2025-01-15
