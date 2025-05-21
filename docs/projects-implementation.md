# Projects Implementation Documentation

This document outlines the implementation of the Projects feature in the portfolio application.

## Table of Contents

1. [Data Model](#data-model)
2. [API Endpoints](#api-endpoints)
3. [Frontend Components](#frontend-components)
4. [Admin Interface](#admin-interface)

## Data Model

The project data is stored in MongoDB using the following schema (defined in `models/project.ts`):

```typescript
interface IProject {
  id: string
  title: string
  slug: string
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

Key fields:

- `id`: Unique identifier for the project
- `slug`: URL-friendly version of the title (auto-generated if not provided)
- `coverImage`: URL to the project's main image
- `coverImageKey`: Reference to the image in the storage system
- `tags`: Array of tags associated with the project
- `status`: Current status of the project ("completed", "in-progress", or "planned")
- `isDraft`: Boolean indicating if the project is a draft or published

## API Endpoints

### GET /api/projects

Retrieves a list of all projects.

**Query Parameters:**

- `fetchAll`: When set to "true", includes draft projects (admin only)

**Response:**

```json
{
  "success": true,
  "data": [Project]
}
```

### POST /api/project

Creates a new project or updates an existing one.

**Query Parameters:**

- `projectId`: (Optional) ID of the project to update

**Request Body:**
FormData containing project fields including:

- `title`: Project title
- `description`: Project description
- `tags`: JSON string of tag objects with id and name
- `coverImage`: Image file for the project (if updating, only required for a new image)
- `githubUrl`: (Optional) Link to GitHub repository
- `liveUrl`: (Optional) Link to live demo
- `status`: Project status
- `featured`: Boolean flag for featured projects
- `isDraft`: Boolean flag for draft status

**Response:**

```json
{
  "success": true,
  "data": Project
}
```

### GET /api/project/[slug]

Retrieves a specific project by its slug.

**Path Parameters:**

- `slug`: The slug of the project to retrieve

**Response:**

```json
{
  "success": true,
  "data": Project
}
```

### DELETE /api/project/[slug]

Deletes a specific project by its slug.

**Path Parameters:**

- `slug`: The slug of the project to delete

**Response:**

```json
{
  "success": true
}
```

## Frontend Components

### Projects Page (`app/projects/page.tsx`)

Displays a list of published projects from the database.

Features:

- Server-side data fetching from MongoDB
- Responsive grid layout for project cards
- Displays project information including:
  - Cover image
  - Title
  - Description
  - Tags
  - Links to GitHub and live demo when available

## Admin Interface

### Projects List Page (`app/admin/projects/page.tsx`)

Admin interface for managing projects.

Features:

- Client-side data fetching with React hooks
- Search functionality
- Sorting by featured status and publishing status
- Table view with actions for editing and deleting projects

### Project Form (`app/admin/projects/new/page.tsx` and `app/admin/projects/edit/[slug]/page.tsx`)

Form for creating and editing projects.

Features:

- Form validation with Zod schema
- Image upload functionality
- Tag selection with ability to create new tags
- Status selection (completed, in-progress, planned)
- Draft mode
- Slug auto-generation from title

Form fields:

- Title
- Slug (with auto-generation option)
- Description
- Cover image upload
- Tags selection
- GitHub URL
- Live demo URL
- Project status
- Featured flag

## Image Handling

Projects support image uploads:

1. When a user uploads an image, it is temporarily stored
2. Upon successful project creation/update, the image is moved to permanent storage
3. The previous image (if any) is deleted to conserve storage space

## Tags System

The projects system leverages the same tag system used by the blog:

1. Tags can be selected from existing tags
2. New tags can be created on-the-fly
3. Tags are shared between blogs and projects for consistent categorization

## Status and Draft System

Projects can have both a development status and a publishing status:

- Development status (completed, in-progress, planned) describes the actual state of the project
- Publishing status (draft or published) controls visibility on the public site

Only published projects appear on the public-facing projects page.
