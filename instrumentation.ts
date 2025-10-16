/**
 * Next.js Instrumentation Hook
 * This file runs once when the Next.js server starts
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { logger } from './lib/logger'

/**
 * Register function is called once when the server starts
 */
export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Skip database connection during build phase
      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

      if (!isBuildTime) {
        logger.info('Server starting - initializing MongoDB connection...')

        // Dynamically import to avoid issues during build
        const { default: connectToDatabase } = await import('./lib/mongodb')

        await connectToDatabase()
        logger.info('MongoDB connection initialized successfully')
      } else {
        logger.info('Build phase detected - skipping MongoDB initialization')
      }
    } catch (error) {
      logger.error('Failed to initialize MongoDB connection on startup', { error })
      // Don't throw - let individual API routes handle connection failures
      // This prevents server crash on startup
    }
  }
}
