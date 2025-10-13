'use client'

import { useEffect, useRef } from 'react'

interface UseViewTrackerOptions {
  blogId: string
  delay?: number // Delay in milliseconds before tracking the view
  onTrack?: () => void // Callback when view is successfully tracked
}

// Cookie-based view tracking with expiration
import { getCookie, setSimpleCookie } from '@/utils/cookies'

const COOKIE_PREFIX = 'viewed_'
const VIEW_EXPIRY_DAYS = 7 // Views expire after 7 days

// Check if a blog post has been viewed
function hasViewedPost(blogId: string): boolean {
  const cookieName = `${COOKIE_PREFIX}${blogId}`
  return getCookie(cookieName) === 'true'
}

// Mark a blog post as viewed
function markPostAsViewed(blogId: string) {
  const cookieName = `${COOKIE_PREFIX}${blogId}`
  setSimpleCookie(cookieName, 'true', VIEW_EXPIRY_DAYS)
}

export function useViewTracker({ blogId, delay = 2000, onTrack }: UseViewTrackerOptions) {
  const hasTracked = useRef(false)

  useEffect(() => {
    // Check if this post has already been viewed (cookie exists and not expired)
    if (hasViewedPost(blogId)) {
      hasTracked.current = true
      return
    }

    // Only track once per session for this blog post
    if (hasTracked.current) return

    const trackView = async () => {
      try {
        const response = await fetch(`/api/blog/${blogId}/views`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          hasTracked.current = true
          markPostAsViewed(blogId)
          onTrack?.() // Call the callback to update UI
        }
      } catch (error) {
        console.error('Failed to track view:', error)
      }
    }

    // Track view after a delay to ensure user is actually reading
    const timer = setTimeout(trackView, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [blogId, delay, onTrack])

  return { hasTracked: hasTracked.current }
}
