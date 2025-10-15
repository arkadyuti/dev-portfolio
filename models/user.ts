import mongoose, { Document, Model, Schema } from 'mongoose'

/**
 * User role types
 */
export type UserRole = 'admin' | 'editor' | 'viewer'

/**
 * User interface
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  email: string
  passwordHash: string
  name: string
  role: UserRole
  failedLoginAttempts: number
  lockUntil: Date | null
  lastLogin: Date | null
  passwordChangedAt: Date
  createdAt: Date
  updatedAt: Date

  // Virtual property
  isLocked: boolean

  // Instance methods
  incrementFailedAttempts(): Promise<void>
  resetFailedAttempts(): Promise<void>
}

/**
 * User Schema
 */
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'],
      default: 'viewer',
      required: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
)

/**
 * Virtual property: Check if account is locked
 */
UserSchema.virtual('isLocked').get(function (this: IUser) {
  // Check if lockUntil is in the future
  return !!(this.lockUntil && this.lockUntil > new Date())
})

/**
 * Ensure JSON includes virtuals
 */
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret) {
    // Remove sensitive fields from JSON output
    delete ret.passwordHash
    delete ret.__v
    return ret
  },
})

/**
 * Pre-save middleware: Enforce single admin rule
 */
UserSchema.pre('save', async function (next) {
  // Only check if role is admin and document is new
  if (this.isNew && this.role === 'admin') {
    const adminCount = await (this.constructor as Model<IUser>).countDocuments({
      role: 'admin',
    })

    if (adminCount > 0) {
      throw new Error('Only one admin user is allowed in the system')
    }
  }

  next()
})

/**
 * Instance method: Increment failed login attempts
 * Lock account after 5 failed attempts for 30 minutes
 */
UserSchema.methods.incrementFailedAttempts = async function (this: IUser) {
  // If we have a previous lock that has expired, reset attempts
  if (this.lockUntil && this.lockUntil < new Date()) {
    return await this.updateOne({
      $set: {
        failedLoginAttempts: 1,
        lockUntil: null,
      },
    })
  }

  // Otherwise increment attempts
  const updates: { $inc: { failedLoginAttempts: number }; $set?: { lockUntil: Date } } = {
    $inc: { failedLoginAttempts: 1 },
  }

  // Lock account after 5 failed attempts (30 minutes lockout)
  const maxAttempts = 5
  if (this.failedLoginAttempts + 1 >= maxAttempts) {
    updates.$set = {
      lockUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    }
  }

  return await this.updateOne(updates)
}

/**
 * Instance method: Reset failed login attempts
 */
UserSchema.methods.resetFailedAttempts = async function (this: IUser) {
  return await this.updateOne({
    $set: {
      failedLoginAttempts: 0,
      lockUntil: null,
    },
  })
}

/**
 * Static method: Find user by email (case-insensitive)
 */
UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() })
}

// Prevent model recompilation in development
const User = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema)

export default User
