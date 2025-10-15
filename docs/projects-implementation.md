# Projects System

## Overview

Project portfolio system with MongoDB storage, MinIO image storage, and tag-based categorization. Supports featured projects, draft mode, and project status tracking.

## Architecture

### Data Flow

1. Admin creates/edits project via form (`/admin/projects/new`)
2. Cover image uploaded to MinIO
3. Project saved to MongoDB with metadata
4. Public page fetches published projects (`/projects`)

### Key Files

- `models/project.ts` - MongoDB schema with Mongoose, Zod validation
- `app/api/projects/route.ts` - List all projects (GET)
- `app/api/project/route.ts` - Create/update project (POST)
- `app/api/project/[id]/route.ts` - Get by ID (GET), delete (DELETE)
- `app/projects/page.tsx` - Public projects list
- `app/admin/projects/page.tsx` - Admin management interface
- `app/admin/projects/new/page.tsx` - Create/edit form

## Data Model

```typescript
interface IProject {
  id: string
  title: string
  slug: string // Auto-generated from title
  description: string
  coverImage: string
  coverImageKey?: string
  tags: Tag[]
  featured: boolean
  githubUrl?: string
  liveUrl?: string
  status: 'completed' | 'in-progress' | 'planned'
  isDraft?: boolean
}
```

### Key Fields

- **slug**: URL-friendly, auto-generated from title if not provided
- **status**: Development status (separate from publish status)
- **isDraft**: Controls public visibility
- **featured**: Priority sorting (featured projects shown first)

## API Endpoints

### GET /api/projects

List all projects

- Query: `fetchAll=true` (includes drafts, admin only)
- Sorting: Featured first, then by creation date
- Response: `{ success: true, data: Project[] }`

### POST /api/project

Create/update project (FormData)

- Query: `projectId` (for updates)
- Fields: `title`, `description`, `tags`, `coverImage` (file), `githubUrl`, `liveUrl`, `status`, `featured`, `isDraft`
- Auto-generates slug from title

### GET /api/project/[id]

Get single project by ID

- Response: `{ success: true, data: Project }`

### DELETE /api/project/[id]

Delete project by ID

- Cleans up cover image from MinIO
- Response: `{ success: true }`

## Image Handling

### Storage Strategy

- **MinIO S3-compatible storage** for cover images
- Upload flow: Temp location → save project → move to final location
- Old image cleanup on update/delete

### Upload Flow

1. Upload cover image to temp location
2. Save project to MongoDB
3. Move image from temp to `project-images/` directory
4. Delete old image if updating

## Tags System

- Shared tags between blogs and projects
- Selectable from existing tags
- New tags can be created on-the-fly
- Consistent categorization across content types

## Status System

### Development Status

- **completed**: Project is finished
- **in-progress**: Currently being developed
- **planned**: Future project

### Publishing Status

- **isDraft = false**: Visible on public site
- **isDraft = true**: Hidden from public, visible in admin

Only published (non-draft) projects appear on `/projects` page.

## Admin Interface

### Projects List (`/admin/projects/page.tsx`)

- Client-side data fetching with React Query
- Search functionality
- Sorting by featured/draft status
- Table view with edit/delete actions

### Project Form (`/admin/projects/new`)

- Create new or edit existing (via `?projectId=...`)
- Form validation with Zod
- Cover image upload
- Tag selection/creation
- Status dropdown
- Draft/featured toggles
- Auto-slug generation

## Public Display

### Projects Page (`/projects`)

- Server-side fetching (published only)
- Responsive grid layout
- Shows: cover image, title, description, tags, links
- Featured projects sorted first

---

**Dependencies**: MongoDB/Mongoose, MinIO, Zod
**Last Updated**: 2025-01-15
