# Blog System

## Overview

Full-featured blog system with MongoDB storage, BlockNote rich text editor, MinIO image storage, and view tracking. Supports drafts, tags, featured posts, and SEO-friendly slugs.

## Architecture

### Data Flow

1. Admin creates/edits blog via BlockNote editor (`/admin/blogs/new`)
2. Images uploaded to MinIO via `/api/blog-content-image`
3. Blog saved to MongoDB with content + metadata
4. Public pages fetch from MongoDB (`/blogs`, `/blogs/[slug]`)
5. View tracking increments on individual blog page loads

### Key Files

- `models/blog.ts` - MongoDB schema with Mongoose, Zod validation, transform utilities
- `app/api/blog/route.ts` - Create/update blog (POST), list blogs (GET)
- `app/api/blog/[slug]/route.ts` - Get blog by slug (GET)
- `app/api/blog/[id]/route.ts` - Delete blog (DELETE)
- `app/api/blog-content-image/route.ts` - Upload content images
- `app/blogs/page.tsx` - Public blog list with pagination
- `app/blogs/[slug]/page.tsx` - Individual blog post with view counter
- `app/admin/blogs/new/page.tsx` - Blog editor (create/edit)
- `components/BlockNoteEditor/BlockNoteEditor.tsx` - Rich text editor component

## Data Model

```typescript
interface IBlog {
  id: string
  publishedAt: number
  title: string
  excerpt: string
  coverImage: string
  coverImageKey?: string
  author: string
  slug: string // Auto-generated, unique
  content: string // HTML
  contentRTE: unknown // BlockNote JSON
  contentImages: string[] // Array of uploaded image URLs
  tags: Tag[]
  featured: boolean
  isDraft?: boolean
  views?: number // Unique view count
}
```

### Slug Generation

- Auto-generated from title using `github-slugger`
- Collision handling: appends `-1`, `-2`, etc. if slug exists
- Updated on title change

## API Endpoints

### GET /api/blogs

List blogs with pagination

- Query: `page`, `limit`, `fetchAll=true` (includes drafts, admin only)
- Response: `{ data: Blog[], pagination: { total, page, limit, totalPages } }`

### GET /api/blog/[slug]

Get single blog by slug

- Response: `{ data: Blog }`

### POST /api/blog

Create/update blog (FormData)

- Fields: `title`, `author`, `excerpt`, `content`, `contentRTE`, `contentImages`, `coverImage` (file), `tags`, `featured`, `isDraft`
- Auto-generates slug from title
- Handles cover image upload to MinIO

### DELETE /api/blog/[id]

Delete blog and associated images

- Cleans up MinIO images (cover + content images)

### POST /api/blog-content-image

Upload content image to MinIO

- Used by BlockNote editor during content creation
- Returns public image URL

## Image Handling

### Storage Strategy

- **MinIO S3-compatible storage** for all images
- Cover images: Uploaded on form submission
- Content images: Uploaded immediately when inserted in editor
- Image tracking: `contentImages` array stores all content image URLs

### Upload Flow

1. User inserts image in BlockNote editor
2. Image uploaded to `/api/blog-content-image` → MinIO
3. Public URL returned and inserted in editor
4. URL tracked via `onImageUpload` callback
5. On blog save, all image URLs stored in `contentImages` field

### Cleanup

- On blog delete: Removes cover image + all content images from MinIO

## BlockNote Editor

### Component (`components/BlockNoteEditor/BlockNoteEditor.tsx`)

```typescript
interface BlockNoteEditorLocalProps {
  onDataChange: (blocks: Block[], html: string) => void
  initialContent?: PartialBlock[]
  onImageUpload?: (imageUrl: string) => void
}
```

### State Management

Editor state tracked via ref in blog form:

```typescript
editorRef.current = {
  contentRTE: blockNoteJSON,
  contentImages: ['url1', 'url2'],
  content: htmlString,
}
```

### Features

- Rich text formatting
- Image upload with drag-and-drop
- Real-time HTML conversion
- Content change callbacks

## Blog Display

### Homepage Recent Posts

- Fetches 3 most recent published blogs
- Server-side: `BlogModels.find({ isDraft: false }).sort({ publishedAt: -1 }).limit(3)`

### Blog List Page (`/blogs`)

- Server-side pagination
- Displays: cover image, title, excerpt, date, tags
- Responsive grid layout

### Individual Blog Page (`/blogs/[slug]`)

- Server-side fetch by slug
- View counter with unique tracking (see `view-counter-implementation.md`)
- Reading time calculation
- Related posts section
- Social sharing buttons

## Admin Features

### Blog Editor (`/admin/blogs/new`)

- Create new blog or edit existing (via `?id=blogId`)
- BlockNote rich text editor
- Cover image upload
- Tag management
- Draft/publish toggle
- Auto-save support (not implemented yet)

### Form Submission

1. Collect form data (title, author, excerpt, etc.)
2. Append editor state: `contentRTE`, `content`, `contentImages`
3. POST to `/api/blog` as FormData
4. Server generates slug, uploads cover image, saves to MongoDB

## SEO Features

- URL-friendly slugs
- Meta tags generated from excerpt
- Open Graph tags for social sharing
- Reading time calculation
- View counter for engagement metrics

---

**Dependencies**: BlockNote, MongoDB/Mongoose, MinIO, github-slugger
**Last Updated**: 2025-01-15
