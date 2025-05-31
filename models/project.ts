import mongoose, { Schema, models, Document, Model } from 'mongoose'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Define Tag interface
interface Tag {
  id: string
  name: string
}

// Zod schema for project validation and transformation
export const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  coverImage: z.string(),
  coverImageKey: z.string().optional(),
  tags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  featured: z.boolean(),
  githubUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  status: z.enum(['completed', 'in-progress', 'planned']),
  isDraft: z.boolean().optional(),
})

// Type inference from Zod schema
export type IProject = z.infer<typeof projectSchema>

// Type for Mongoose document with IProject
type ProjectDocument = Document & Omit<IProject, 'id'> & { _id: mongoose.Types.ObjectId }

// Type for Mongoose model
type ProjectModel = Model<ProjectDocument>

// Generic utility function to transform and validate Mongoose document to any type
export const transformToType = <T>(
  doc: Document | Record<string, unknown> | null,
  schema: z.ZodType<T>
): T | null => {
  if (!doc) return null

  // Handle both Mongoose documents and plain objects
  const data = 'toObject' in doc ? (doc as Document).toObject() : doc

  // Map _id to id for MongoDB documents
  const transformedData = {
    ...data,
    id: data._id?.toString() || data.id,
  }

  try {
    return schema.parse(transformedData)
  } catch (error) {
    logger.error('Schema validation error', error)
    return null
  }
}

// Utility function to transform and validate Mongoose document to IProject
export const transformToProject = (
  doc: Document | Record<string, unknown> | null
): IProject | null => {
  return transformToType(doc, projectSchema)
}

// Utility function to transform and validate multiple Mongoose documents to IProject array
export const transformToProjects = (docs: ProjectDocument[]): IProject[] => {
  return docs
    .map((doc) => transformToType(doc, projectSchema))
    .filter((project): project is IProject => project !== null)
}

const ProjectSchema = new Schema<ProjectDocument>(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for this project'],
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      sparse: true, // This allows the field to be unique only if it exists
    },
    description: {
      type: String,
      required: [true, 'Please provide a description for this project'],
      maxlength: [600, 'Description cannot be more than 600 characters'],
    },
    coverImage: {
      type: String,
      required: [true, 'Please provide a cover image for this project'],
    },
    coverImageKey: {
      type: String,
      required: false,
    },
    tags: [
      {
        id: String,
        name: String,
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    githubUrl: {
      type: String,
      required: false,
    },
    liveUrl: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['completed', 'in-progress', 'planned'],
      default: 'completed',
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Auto-generate slug from title if not provided
ProjectSchema.pre('save', async function (this: ProjectDocument, next) {
  if (!this.slug && this.title) {
    // Create base slug from title
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace any sequence of non-alphanumeric chars with a single dash
      .replace(/^-|-$/g, '') // Remove leading and trailing dashes

    // First try using the base slug
    let slug = baseSlug

    // Check if a project with this slug already exists
    const ProjectModel = this.constructor as ProjectModel
    const existingProject = await ProjectModel.findOne({ slug: slug })

    // If the slug already exists, append a timestamp to make it unique
    if (existingProject) {
      // Generate a timestamp suffix (last 6 digits for brevity)
      const timestamp = Date.now().toString().slice(-6)
      slug = `${baseSlug}-${timestamp}`
    }

    this.slug = slug
  }
  next()
})

// Check if the model exists before creating a new one
// This prevents "Cannot overwrite model once compiled" errors
const ProjectModels =
  (models.projects as ProjectModel) || mongoose.model<ProjectDocument>('projects', ProjectSchema)

export default ProjectModels
