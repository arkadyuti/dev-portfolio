/**
 * Utility functions for cookie-based view tracking
 * Uses industry-standard cookie utilities for better maintainability
 */

import { getCookie, setSimpleCookie, getAllCookies } from './cookies'

const COOKIE_PREFIX = 'viewed_'
const VIEW_EXPIRY_DAYS = 7

/**
 * Get list of viewed post IDs from cookies
 */
export function getViewedPostIds(): string[] {
  if (typeof window === 'undefined') return []

  const allCookies = getAllCookies()
  const viewedIds: string[] = []

  Object.entries(allCookies).forEach(([name, value]) => {
    if (name.startsWith(COOKIE_PREFIX) && value === 'true') {
      const blogId = name.substring(COOKIE_PREFIX.length)
      viewedIds.push(blogId)
    }
  })

  return viewedIds
}

/**
 * Check if a specific post has been viewed
 */
export function hasViewedPost(blogId: string): boolean {
  const cookieName = `${COOKIE_PREFIX}${blogId}`
  return getCookie(cookieName) === 'true'
}

/**
 * Manually mark a post as viewed (useful for testing)
 */
export function markPostAsViewed(blogId: string): void {
  const cookieName = `${COOKIE_PREFIX}${blogId}`
  setSimpleCookie(cookieName, 'true', VIEW_EXPIRY_DAYS)
}

// Make functions available globally for debugging in browser console
if (typeof window !== 'undefined') {
  ;(window as unknown as { viewTracking: unknown }).viewTracking = {
    getViewedPostIds,
    hasViewedPost,
    markPostAsViewed,
    getExpiryDays: () => VIEW_EXPIRY_DAYS,
  }
}
