# View Counter System

## Overview

Cookie-based unique view tracking for blog posts with 7-day expiration. Provides optimistic UI updates and displays view counts across homepage, blog list, and individual posts.

## Architecture

### Data Flow

1. User visits blog post → ViewTracker component loads
2. Check cookie (`viewed_{blogId}`) → if exists, skip tracking
3. If new: Wait 2 seconds → POST `/api/blog/[id]/views`
4. API increments MongoDB views counter
5. Set cookie with 7-day TTL
6. Update UI optimistically (+1)

### Key Files

- `app/api/blog/[id]/views/route.ts` - Increment (POST), get count (GET)
- `components/ViewTracker.tsx` - Client component with optimistic updates
- `hooks/useViewTracker.ts` - View tracking logic
- `utils/view-tracking.ts` - Cookie management utilities
- `models/blog.ts` - Schema includes `views` field

## Data Model

```typescript
// Added to Blog schema
interface IBlog {
  // ... existing fields
  views: number // Default: 0, auto-incremented
}
```

## API Endpoints

### POST /api/blog/[id]/views

Increment view count

- Uses MongoDB `$inc` operator
- Logs client IP for basic duplicate protection
- Response: `{ success: true, data: { id, views } }`

### GET /api/blog/[id]/views

Get current view count

- Response: `{ success: true, data: { id, views } }`

## View Tracking Logic

### Unique View Definition

- One view per blog per browser (7-day cookie)
- Cookie: `viewed_{blogId} = true`
- Expires after 7 days → revisit can be counted again
- Per-post tracking (independent cookies)

### Tracking Flow

1. **Page load** → Check cookie
2. **Cookie exists?** → Skip (already viewed)
3. **No cookie** → Wait 2 seconds (engagement check)
4. **POST to API** → Increment MongoDB counter
5. **Success** → Set cookie + optimistic UI update (+1)

### 2-Second Delay

- Ensures actual engagement (not quick bounce)
- Prevents counting accidental clicks/refreshes
- Only tracks users who spend time on page

## Cookie Management

```typescript
// Cookie structure
viewed_blog-123 = true
expires = 7 days from now
path = /
SameSite = Lax
```

### Advantages

- Auto-expiration (browser handles cleanup)
- No localStorage bloat
- Cross-tab consistent
- Server-accessible if needed

## Components

### ViewTracker Component

```typescript
<ViewTracker
  blogId={post.id}
  initialViews={post.views || 0}
/>
```

Features:

- Optimistic UI updates
- View count formatting (1K, 1M)
- Eye icon + count display

### useViewTracker Hook

```typescript
useViewTracker({
  blogId: string
  delay?: number  // Default: 2000ms
  onTrack?: () => void  // Callback for UI update
})
```

## UI Integration

### Blog Detail Page

Full ViewTracker component with tracking

### Blog List / Homepage

Static view count display (no tracking):

```tsx
;<Eye className="h-3 w-3" />
{
  post.views || 0
}
```

## Performance

- **Database**: Single `$inc` operation per unique view
- **Frontend**: 2s delay reduces unnecessary API calls
- **Cookie**: Lightweight, browser-managed
- **Async**: Non-blocking, doesn't affect page render

## Error Handling

- **API failure**: Logged, UI not updated, no cookie set
- **Cookie failure**: Continues without persistence
- **Database failure**: Non-blocking, graceful degradation

## Testing

### Browser Console

```javascript
// Get viewed post IDs
viewTracking.getViewedPostIds()

// Check if post viewed
viewTracking.hasViewedPost('blog-123')

// Manually mark as viewed
viewTracking.markPostAsViewed('blog-123')
```

### Test Scenarios

1. Fresh visit (incognito) → should increment after 2s
2. Refresh → should NOT increment
3. Open in new tab → should NOT increment
4. Different post → should increment independently
5. Wait 7 days → should increment again

---

**Dependencies**: MongoDB, Cookies, React hooks
**Last Updated**: 2025-01-15
