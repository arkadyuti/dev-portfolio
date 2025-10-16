import crypto from 'crypto'

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses Node.js crypto.timingSafeEqual for cryptographically secure comparison
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  try {
    // Convert strings to buffers of equal length
    // If lengths differ, pad shorter one with zeros to prevent length leaking
    const maxLength = Math.max(a.length, b.length)
    const bufferA = Buffer.alloc(maxLength)
    const bufferB = Buffer.alloc(maxLength)

    bufferA.write(a)
    bufferB.write(b)

    // Perform constant-time comparison
    const equal = crypto.timingSafeEqual(bufferA, bufferB)

    // Also check original lengths to prevent padding bypass
    return equal && a.length === b.length
  } catch (error) {
    // If any error occurs, return false (fail-safe)
    return false
  }
}

/**
 * Generate cryptographically secure random string
 *
 * @param length - Length of random string in bytes (default: 32)
 * @returns Hex-encoded random string
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate cryptographically secure random token (URL-safe base64)
 *
 * @param length - Length of random token in bytes (default: 32)
 * @returns URL-safe base64-encoded random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url')
}
