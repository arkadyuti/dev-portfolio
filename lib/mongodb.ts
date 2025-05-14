// src/lib/mongodb.ts
import mongoose from 'mongoose';
import { logger } from './logger';

if (!process.env.MONGODB_URI) {
  logger.error('MONGODB_URI environment variable is not defined');
  throw new Error('Please define the MONGODB_URI environment variable');
}

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    logger.info('Creating new MongoDB connection');

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        logger.info('MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        logger.error('MongoDB connection failed', { error: error.message });
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    logger.error('Failed to resolve MongoDB connection', { error: e });
    throw e;
  }

  return cached.conn;
}

// Add event listeners for MongoDB connection
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection disconnected');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to application termination');
    process.exit(0);
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error });
    process.exit(1);
  }
});

export default connectToDatabase;