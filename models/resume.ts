import mongoose, { Schema, models, Document, Model } from 'mongoose'
import { z } from 'zod'
import { transformToType } from './blog'

// Zod schema for resume validation and transformation
export const resumeSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileKey: z.string(),
  fileUrl: z.string(),
  fileSize: z.number(),
  uploadedAt: z.number(),
  mimeType: z.string(),
})

// Type inference from Zod schema
export type IResume = z.infer<typeof resumeSchema>

// Type for Mongoose document with IResume
type ResumeDocument = Document & IResume

// Type for Mongoose model
type ResumeModelType = Model<IResume>

// Utility function to transform and validate Mongoose document to IResume
export const transformToResume = (
  doc: Document | Record<string, unknown> | null
): IResume | null => {
  return transformToType(doc, resumeSchema)
}

const ResumeSchema = new Schema<IResume>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileKey: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

// Check if the model exists before creating a new one
const ResumeModel =
  (models.resume as ResumeModelType) || mongoose.model<IResume>('resume', ResumeSchema)

export default ResumeModel
