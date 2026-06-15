import { afterEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

/**
 * Test environment variables.
 * Several modules (lib/mongodb, lib/auth/jwt-*) throw at import time when these
 * are missing, so they must be defined before any module under test is imported.
 * Set with ||= so a real value from the shell still wins if present.
 */
process.env.MONGODB_URI ||= 'mongodb://localhost:27017/portfolio-test'
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-at-least-32-characters-long'
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-at-least-32-characters-long'
process.env.JWT_SECRET_VERSION ||= '1'
process.env.MINIO_ENDPOINT ||= 'minio.test.local'
process.env.MINIO_IMAGE_BUCKET ||= 'portfolio'
process.env.REDIS_HOST ||= 'localhost'
process.env.REDIS_PORT ||= '6379'

// Clean up the DOM and any mocks between tests to keep them isolated.
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
