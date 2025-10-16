/**
 * API Middleware utilities
 * Provides wrapper functions for API routes to handle common concerns
 */

import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase, { isConnected } from './mongodb'
import { logger } from './logger'

/**
 * API Route Handler type
 */
export type ApiRouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>

/**
 * Wrapper that ensures MongoDB connection before executing API route
 * This provides a safety net - connection should already be established via instrumentation.ts
 */
export function withDatabase(handler: ApiRouteHandler): ApiRouteHandler {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      // Check if already connected (should be true if instrumentation worked)
      if (!isConnected()) {
        logger.warn('Database not connected - attempting to connect now')
        await connectToDatabase()
      }

      // Execute the actual route handler
      return await handler(request, context)
    } catch (error) {
      logger.error('Database middleware error', { error })

      // If it's a database connection error, return a specific error
      if (error instanceof Error && error.message.includes('MongoDB')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Database connection error',
              code: 'DATABASE_ERROR',
            },
          },
          { status: 503 }
        )
      }

      // Re-throw other errors to be handled by the route
      throw error
    }
  }
}

/**
 * Combine multiple middleware functions
 */
export function withMiddleware(
  ...middlewares: Array<(handler: ApiRouteHandler) => ApiRouteHandler>
) {
  return (handler: ApiRouteHandler): ApiRouteHandler => {
    return middlewares.reduceRight((wrapped, middleware) => middleware(wrapped), handler)
  }
}
