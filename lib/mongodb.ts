// src/lib/mongodb.ts
import mongoose from 'mongoose'
import { logger } from './logger'

if (!process.env.MONGODB_URI) {
  logger.error('MONGODB_URI environment variable is not defined')
  throw new Error('Please define the MONGODB_URI environment variable')
}

const MONGODB_URI = process.env.MONGODB_URI

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectToDatabase() {
  // Skip database connection during build phase
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'
  if (isBuildTime) {
    throw new Error('Database connection skipped during build phase')
  }

  // If the connection is already established, reuse it
  if (cached.conn) {
    return cached.conn
  }

  // If a connection is being established, wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Add connection pooling options
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
    }

    // Only log new connection in non-production environments or if explicitly requested
    const isProduction = process.env.NODE_ENV === 'production'
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

    if (!isProduction || !isBuildTime) {
      logger.info('Creating new MongoDB connection')
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        if (!isProduction || !isBuildTime) {
          logger.info('MongoDB connected successfully')
        }
        return mongoose
      })
      .catch((error) => {
        logger.error('MongoDB connection failed', { error: error.message })
        cached.promise = null
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    logger.error('Failed to resolve MongoDB connection', { error: e })
    throw e
  }

  return cached.conn
}

// Only register these event listeners once
if (!global.mongoEventListenersRegistered) {
  // Add event listeners for MongoDB connection
  mongoose.connection.on('connected', () => {
    const isProduction = process.env.NODE_ENV === 'production'
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

    if (!isProduction || !isBuildTime) {
      logger.info('MongoDB connection established')
    }
  })

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message })
  })

  mongoose.connection.on('disconnected', () => {
    const isProduction = process.env.NODE_ENV === 'production'
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

    if (!isProduction || !isBuildTime) {
      logger.warn('MongoDB connection disconnected')
    }
  })

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close()
      logger.info('MongoDB connection closed due to application termination')
      process.exit(0)
    } catch (error) {
      logger.error('Error closing MongoDB connection', { error })
      process.exit(1)
    }
  })

  global.mongoEventListenersRegistered = true
}

export default connectToDatabase
