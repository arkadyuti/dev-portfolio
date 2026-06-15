import { describe, it, expect, beforeEach } from 'vitest'
import { getViewedPostIds, hasViewedPost, markPostAsViewed } from './view-tracking'

/**
 * view-tracking.ts uses cookie utilities under the hood.
 * jsdom provides document.cookie so we can do real round-trips.
 */

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim()
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  })
}

describe('view-tracking', () => {
  beforeEach(() => {
    clearCookies()
  })

  // -----------------------------------------------------------------------
  // hasViewedPost
  // -----------------------------------------------------------------------
  describe('hasViewedPost', () => {
    it('returns false for a post that has never been viewed', () => {
      expect(hasViewedPost('post-123')).toBe(false)
    })

    it('returns true after markPostAsViewed is called', () => {
      markPostAsViewed('post-abc')
      expect(hasViewedPost('post-abc')).toBe(true)
    })

    it('returns false for a different post id', () => {
      markPostAsViewed('post-1')
      expect(hasViewedPost('post-2')).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // markPostAsViewed
  // -----------------------------------------------------------------------
  describe('markPostAsViewed', () => {
    it('sets the viewed_ prefixed cookie to "true"', () => {
      markPostAsViewed('blog-42')
      // The cookie name is `viewed_blog-42`, and its value should be 'true'
      // We read document.cookie directly to verify the raw state
      expect(document.cookie).toContain('viewed_blog-42=true')
    })

    it('can mark multiple posts as viewed independently', () => {
      markPostAsViewed('a')
      markPostAsViewed('b')
      expect(hasViewedPost('a')).toBe(true)
      expect(hasViewedPost('b')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // getViewedPostIds
  // -----------------------------------------------------------------------
  describe('getViewedPostIds', () => {
    it('returns an empty array when no posts have been viewed', () => {
      expect(getViewedPostIds()).toEqual([])
    })

    it('returns the id of a single viewed post', () => {
      markPostAsViewed('post-xyz')
      const ids = getViewedPostIds()
      expect(ids).toContain('post-xyz')
    })

    it('returns all viewed post ids', () => {
      markPostAsViewed('p1')
      markPostAsViewed('p2')
      markPostAsViewed('p3')
      const ids = getViewedPostIds()
      expect(ids).toContain('p1')
      expect(ids).toContain('p2')
      expect(ids).toContain('p3')
      expect(ids).toHaveLength(3)
    })

    it('does not include cookies that do not have the viewed_ prefix', () => {
      // Set a random cookie not related to view tracking
      document.cookie = 'theme=dark; path=/'
      markPostAsViewed('post-1')
      const ids = getViewedPostIds()
      expect(ids).not.toContain('theme')
      expect(ids).toContain('post-1')
    })

    it('does not include viewed_ cookies whose value is not "true"', () => {
      // Manually set a cookie with viewed_ prefix but wrong value
      document.cookie = 'viewed_post-bad=false; path=/'
      const ids = getViewedPostIds()
      expect(ids).not.toContain('post-bad')
    })
  })

  // -----------------------------------------------------------------------
  // server-side guard (window === undefined)
  // -----------------------------------------------------------------------
  describe('server-side guard', () => {
    it('getViewedPostIds returns [] when window is undefined', () => {
      const origWindow = global.window
      // @ts-expect-error – intentionally delete
      delete global.window
      expect(getViewedPostIds()).toEqual([])
      global.window = origWindow
    })
  })
})
