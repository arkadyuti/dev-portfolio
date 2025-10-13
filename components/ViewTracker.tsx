'use client'

import { useState } from 'react'
import { useViewTracker } from '@/hooks/useViewTracker'
import { Eye } from 'lucide-react'

interface ViewTrackerProps {
  blogId: string
  initialViews?: number
  className?: string
}

export function ViewTracker({ blogId, initialViews = 0, className = '' }: ViewTrackerProps) {
  // State to track the display count (optimistic updates)
  const [displayViews, setDisplayViews] = useState(initialViews)

  // Track the view with a 2-second delay and update UI when tracked
  useViewTracker({
    blogId,
    delay: 2000,
    onTrack: () => setDisplayViews((prev) => prev + 1), // Optimistic UI update
  })

  // Format view count for display
  const formatViews = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <span className={`flex items-center gap-1 text-muted-foreground ${className}`}>
      <Eye className="h-4 w-4" />
      <span>{formatViews(displayViews)} views</span>
    </span>
  )
}
