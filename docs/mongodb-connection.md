# MongoDB Connection Management

## Overview

Singleton pattern MongoDB connection with server startup initialization and automatic connection reuse across all API routes. Eliminates redundant connection attempts and ensures optimal performance.

## Architecture

### Connection Lifecycle

1. **Server Startup** (`instrumentation.ts`):

   - Next.js registers hook when server starts
   - MongoDB connection established ONCE
   - Connection pooled and cached globally

2. **API Routes**:

   - Wrapped with `withDatabase` middleware
   - Middleware checks if connected (safety net)
   - Reuses existing connection pool
   - No manual connection calls needed

3. **Connection Persistence**:
   - Global cache prevents duplicate connections
   - Connection pool (min: 5, max: 10) handles concurrent requests
   - Automatic reconnection on connection loss

### Key Files

- `instrumentation.ts` - Server startup hook for MongoDB initialization
- `lib/mongodb.ts` - Singleton connection manager with caching
- `lib/api-middleware.ts` - Middleware wrapper for database-dependent routes
- `models/blog.ts` - Example model using Mongoose schemas
- `app/api/blogs/route.ts` - Example API route with middleware

## Connection Implementation

### Singleton Pattern (`lib/mongodb.ts`)

```typescript
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectToDatabase() {
  // Return cached connection if exists
  if (cached.conn) {
    return cached.conn
  }

  // Establish new connection with pooling
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      bufferCommands: false,
      // ... other options
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
```

**Features:**

- Global cache prevents duplicate connections in development (hot reload)
- Connection pool (5-10 connections) for concurrent requests
- Build-time skip prevents connection during `next build`
- Event listeners for connection monitoring (uses `.once()` to prevent memory leaks)
- Idle connection cleanup (10s timeout) for serverless optimization

### Server Startup Hook (`instrumentation.ts`)

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: connectToDatabase } = await import('./lib/mongodb')
    await connectToDatabase()
    logger.info('MongoDB connection initialized successfully')
  }
}
```

**When it runs:**

- Next.js server startup (both dev and production)
- Before any API route handles requests
- Only in Node.js runtime (not Edge)

### API Middleware (`lib/api-middleware.ts`)

```typescript
export function withDatabase(handler: ApiRouteHandler): ApiRouteHandler {
  return async (request, context) => {
    // Safety net: check connection status
    if (!isConnected()) {
      logger.warn('Database not connected - attempting to connect now')
      await connectToDatabase()
    }

    return await handler(request, context)
  }
}
```

**Usage in routes:**

```typescript
// Before (old pattern)
export async function GET(request: NextRequest) {
  await connectDB() // Redundant call every time
  const blogs = await BlogModels.find()
  // ...
}

// After (new pattern)
async function handler(request: NextRequest) {
  // No manual connection - middleware handles it
  const blogs = await BlogModels.find()
  // ...
}

export const GET = withDatabase(handler)
```

## Connection Utilities

### Helper Functions

```typescript
import { isConnected, getConnectionState, getCachedConnection } from '@/lib/mongodb'

// Check if MongoDB is connected
if (isConnected()) {
  console.log('MongoDB is ready')
}

// Get connection state (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
const state = getConnectionState()

// Get cached connection instance
const conn = getCachedConnection()
```

## Connection Pooling

### Pool Configuration

```typescript
{
  maxPoolSize: 10,           // Max concurrent connections
  minPoolSize: 5,            // Min idle connections
  maxIdleTimeMS: 10000,      // Close idle connections after 10s (critical for serverless)
  socketTimeoutMS: 45000,    // Socket inactivity timeout
  connectTimeoutMS: 10000,   // Initial connection timeout
  serverSelectionTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
}
```

**How it works:**

- 5 connections always ready (minPoolSize)
- Scales up to 10 for high concurrency (maxPoolSize)
- Connections reused across requests
- Idle connections automatically closed after 10s (prevents connection exhaustion)
- Critical for serverless/Vercel deployments

## Error Handling

### Connection Failures

**Startup failure:**

```typescript
try {
  await connectToDatabase()
} catch (error) {
  logger.error('Failed to initialize MongoDB connection on startup', { error })
  // Server continues - middleware will retry
}
```

**Runtime failure:**

```typescript
// Middleware catches and returns proper error
if (error.message.includes('MongoDB')) {
  return NextResponse.json(
    { success: false, error: { message: 'Database connection error', code: 'DATABASE_ERROR' } },
    { status: 503 }
  )
}
```

### Graceful Shutdown

```typescript
const gracefulShutdown = async (signal: string) => {
  try {
    await mongoose.connection.close()
    logger.info(`MongoDB connection closed due to ${signal}`)
    process.exit(0)
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error })
    process.exit(1)
  }
}

// Handle both SIGINT (Ctrl+C) and SIGTERM (Docker/Kubernetes)
process.once('SIGINT', () => gracefulShutdown('SIGINT'))
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'))
```

**Handles:**

- `SIGINT`: Development (Ctrl+C)
- `SIGTERM`: Production (Docker/Kubernetes graceful shutdown)
- Uses `.once()` to prevent duplicate handlers

## Performance Benefits

### Before Optimization

- Each API call: `await connectDB()` (even with caching, overhead of function call)
- No guarantee of connection on server start
- Repetitive code in every route

### After Optimization

- **Server startup**: Connection established ONCE
- **API routes**: Zero connection overhead, direct model queries
- **Performance**: ~82-948ms response times with no connection delays
- **Code quality**: DRY principle, cleaner route handlers

### Benchmark

```
Startup logs:
[INFO] Server starting - initializing MongoDB connection...
[INFO] Creating new MongoDB connection
[INFO] MongoDB connected successfully

API call logs:
GET /api/blogs?limit=1 200 in 82ms  ← No connection attempt!
GET /api/blogs 200 in 948ms          ← Reusing same connection!
```

## Best Practices

1. **Never call `connectDB()` directly in routes** - Use middleware wrapper
2. **Always use `withDatabase` for MongoDB routes** - Ensures connection exists
3. **Use connection pool** - Handles concurrency automatically
4. **Monitor connection state** - Use helper functions for debugging
5. **Handle errors gracefully** - Middleware provides fallback connection

## Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017/portfolio  # Required
```

## Routes Using MongoDB

All routes wrapped with `withDatabase` middleware:

- `/api/blogs` - Blog listing
- `/api/blog` - Create/update blog
- `/api/blog/[id]` - Get/delete blog by ID
- `/api/blog/[id]/views` - View counter
- `/api/projects` - Project listing
- `/api/project` - Create/update project
- `/api/project/[id]` - Get/delete project
- `/api/tags` - Tag aggregation
- `/api/search` - Full-text search
- `/api/newsletter` - Newsletter subscriptions
- `/api/auth/signin` - User authentication

Routes **not** using MongoDB (no middleware):

- `/api/ping` - Health check (no database)
- `/api/blog-content-image` - Image upload (MinIO only)
- `/api/auth/refresh` - Token refresh (Redis only)
- `/api/auth/sessions` - Session management (Redis only)
- `/api/auth/signout` - Logout (Redis only)

## Recent Improvements (2025-10-16)

### Critical Fixes Applied

1. **Added `maxIdleTimeMS: 10000`**

   - Automatically closes idle connections after 10 seconds
   - Prevents connection exhaustion in serverless/Vercel deployments
   - Critical for production stability

2. **Fixed Event Listener Memory Leak**

   - Changed `.on('connected')` to `.once('connected')`
   - Prevents duplicate handler registrations
   - Avoids memory leaks in long-running servers

3. **Added SIGTERM Handler**
   - Now handles both `SIGINT` (Ctrl+C) and `SIGTERM` (Docker/K8s)
   - Critical for proper cleanup in containerized environments
   - Uses `.once()` for process signals to prevent duplicate handlers

---

**Dependencies:** Mongoose 8.15.0, MongoDB
**Last Updated:** 2025-10-16
