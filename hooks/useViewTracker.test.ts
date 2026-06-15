import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the cookies module before importing the hook
vi.mock('@/utils/cookies', () => ({
  getCookie: vi.fn(() => null),       // default: not viewed
  setSimpleCookie: vi.fn(),
}))

import { useViewTracker } from '@/hooks/useViewTracker'
import { getCookie, setSimpleCookie } from '@/utils/cookies'

const mockedGetCookie = getCookie as ReturnType<typeof vi.fn>
const mockedSetCookie = setSimpleCookie as ReturnType<typeof vi.fn>

describe('useViewTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
    mockedGetCookie.mockReturnValue(null)  // not viewed by default
    mockedSetCookie.mockClear()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('does not call fetch immediately (before delay)', () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() =>
      useViewTracker({ blogId: 'blog-1', delay: 2000 })
    )

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls fetch after the delay', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() =>
      useViewTracker({ blogId: 'blog-1', delay: 2000 })
    )

    await act(async () => {
      vi.advanceTimersByTime(2000)
      // let microtasks/promises settle
      await Promise.resolve()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/blog/blog-1/views',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('calls onTrack callback when view is successfully tracked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)
    const onTrack = vi.fn()

    renderHook(() =>
      useViewTracker({ blogId: 'blog-2', delay: 1000, onTrack })
    )

    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(onTrack).toHaveBeenCalledTimes(1)
  })

  it('does not call onTrack when fetch fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', mockFetch)
    const onTrack = vi.fn()

    renderHook(() =>
      useViewTracker({ blogId: 'blog-3', delay: 500, onTrack })
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(onTrack).not.toHaveBeenCalled()
  })

  it('does not call fetch when cookie indicates already viewed', () => {
    mockedGetCookie.mockReturnValue('true')
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() =>
      useViewTracker({ blogId: 'blog-4', delay: 500 })
    )

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('marks post as viewed via cookie after successful track', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() =>
      useViewTracker({ blogId: 'blog-5', delay: 500 })
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(mockedSetCookie).toHaveBeenCalledWith(
      'viewed_blog-5',
      'true',
      7 // VIEW_EXPIRY_DAYS
    )
  })

  it('cancels the timer on unmount (no fetch after unmount)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    const { unmount } = renderHook(() =>
      useViewTracker({ blogId: 'blog-6', delay: 2000 })
    )

    unmount()

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does not call fetch twice for the same blogId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    const { rerender } = renderHook(
      ({ blogId }) => useViewTracker({ blogId, delay: 500 }),
      { initialProps: { blogId: 'blog-7' } }
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    // Rerender with same blogId — now hasTracked.current is true
    // (and cookie mock will not be set since we didn't update mockedGetCookie)
    rerender({ blogId: 'blog-7' })

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    // fetch is only called once: the re-render sees hasTracked.current = true
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not call onTrack when fetch throws', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'))
    vi.stubGlobal('fetch', mockFetch)
    const onTrack = vi.fn()

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() =>
      useViewTracker({ blogId: 'blog-8', delay: 500, onTrack })
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(onTrack).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('uses default delay of 2000ms when not specified', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() => useViewTracker({ blogId: 'blog-9' }))

    // Should not fire before 2000ms
    act(() => { vi.advanceTimersByTime(1999) })
    expect(mockFetch).not.toHaveBeenCalled()

    // Should fire at 2000ms
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
