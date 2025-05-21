import mongoose, { Schema, models, Document, Model } from 'mongoose'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

// Zod schema for newsletter validation
export const newsletterSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

// Type inference from Zod schema
export type INewsletter = z.infer<typeof newsletterSchema>

// Type for Mongoose document with INewsletter
type NewsletterDocument = Document & Omit<INewsletter, 'id'> & { _id: mongoose.Types.ObjectId }

// Type for Mongoose model
type NewsletterModel = Model<NewsletterDocument>

// Utility function to transform Mongoose document to INewsletter
export const transformToNewsletter = (doc: NewsletterDocument | null): INewsletter | null => {
  if (!doc) return null

  try {
    const newsletter = {
      id: uuidv4(),
      email: doc.email,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }

    return newsletterSchema.parse(newsletter)
  } catch (error) {
    console.error('Error transforming newsletter document:', error)
    return null
  }
}

// Utility function to transform multiple documents
export const transformToNewsletters = (docs: NewsletterDocument[]): INewsletter[] => {
  return docs
    .map((doc) => transformToNewsletter(doc))
    .filter((newsletter): newsletter is INewsletter => newsletter !== null)
}

const NewsletterSchema = new Schema<NewsletterDocument>(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
)

// Check if the model exists before creating a new one
// This prevents "Cannot overwrite model once compiled" errors
const NewsletterModel =
  (models.newsletters as NewsletterModel) ||
  mongoose.model<NewsletterDocument>('newsletters', NewsletterSchema)

export default NewsletterModel
