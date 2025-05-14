import mongoose, { Schema, models, Document, Model } from 'mongoose'
import { z } from 'zod'

// Zod schema for blog validation and transformation
export const blogSchema = z.object({
  id: z.string(),
  publishedAt: z.number(),
  title: z.string(),
  excerpt: z.string(),
  coverImage: z.string(),
  coverImageKey: z.string().optional(),
  author: z.string(),
  slug: z.string(),
  content: z.any(),
  tags: z.any(),
  featured: z.boolean(),
  isDraft: z.boolean().optional(),
})

// Type inference from Zod schema
export type IBlog = z.infer<typeof blogSchema>

// Type for Mongoose document with IBlog
type BlogDocument = Document & IBlog

// Type for Mongoose model
type BlogModel = Model<IBlog>

// Generic utility function to transform and validate Mongoose document to any type
export const transformToType = <T>(
  doc: Document | Record<string, any> | null,
  schema: z.ZodType<T>
): T | null => {
  if (!doc) return null

  // Handle both Mongoose documents and plain objects
  const data = 'toObject' in doc ? doc.toObject() : doc
  return schema.parse(data)
}

// Utility function to transform and validate Mongoose document to IBlog
export const transformToBlog = (doc: BlogDocument | Record<string, never> | null): IBlog | null => {
  return transformToType(doc, blogSchema)
}

// Utility function to transform and validate multiple Mongoose documents to IBlog array
export const transformToBlogs = (docs: (BlogDocument | Record<string, never>)[]): IBlog[] => {
  return docs
    .map((doc) => transformToType(doc, blogSchema))
    .filter((blog): blog is IBlog => blog !== null)
}

const BlogSchema = new Schema<IBlog>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    publishedAt: {
      type: Number,
      required: true,
    },
    coverImage: {
      type: String,
      required: [true, 'Please provide a cover image for this blog'],
    },
    coverImageKey: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title for this blog'],
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    author: {
      type: String,
      required: [true, 'Please provide a title for this blog'],
    },
    featured: {
      type: Boolean,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    excerpt: {
      type: String,
      required: [true, 'Please provide a mini description for this blog'],
      maxlength: [200, 'Mini description cannot be more than 200 characters'],
    },
    tags: {
      type: [Schema.Types.Mixed],
      required: [true, 'Please provide tags for this blog'],
    },
    slug: {
      type: String,
      unique: true,
      sparse: true, // This allows the field to be unique only if it exists
    },
    // Adding the new field
    content: {
      type: [Schema.Types.Mixed],
      required: [true, 'Please provide content for this blog'],
    },
  },
  {
    timestamps: true,
  }
)

// Auto-generate slug from title if not provided
BlogSchema.pre('save', async function (next) {
  if (!this.slug && this.title) {
    // Create base slug from title
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace any sequence of non-alphanumeric chars with a single dash
      .replace(/^-|-$/g, '') // Remove leading and trailing dashes

    // First try using the base slug
    let slug = baseSlug

    // Check if an article with this slug already exists
    const BlogModel = this.constructor as BlogModel
    const existingBlog = await BlogModel.findOne({ slug: slug })

    // If the slug already exists, append a timestamp to make it unique
    if (existingBlog) {
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
const BlogModels = (models.blogs as BlogModel) || mongoose.model<IBlog>('blogs', BlogSchema)

export default BlogModels
