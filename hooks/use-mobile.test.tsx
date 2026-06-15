import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

// jsdom does not implement window.matchMedia, so we stub it ourselves.

type ChangeListener = () => void

function createMatchMedia(matches: boolean) {
  const listeners: ChangeListener[] = []
  const mql = {
    matches,
    addEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      const idx = listeners.indexOf(cb)
      if (idx > -1) listeners.splice(idx, 1)
    }),
    // Helper to simulate a media query change
    _fire: () => listeners.forEach((l) => l()),
  }
  return mql
}

// We also need to control window.innerWidth
function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

describe('useIsMobile', () => {
  let mqlStub: ReturnType<typeof createMatchMedia>

  beforeEach(() => {
    // Default to desktop width (1024)
    setWindowWidth(1024)
    mqlStub = createMatchMedia(false)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn(() => mqlStub),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when window.innerWidth >= 768 (desktop)', () => {
    setWindowWidth(1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true when window.innerWidth < 768 (mobile)', () => {
    setWindowWidth(375)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false exactly at the 768px boundary', () => {
    setWindowWidth(768)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true at 767px (one below boundary)', () => {
    setWindowWidth(767)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('updates to true when a resize event brings width below 768', () => {
    setWindowWidth(1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      setWindowWidth(375)
      mqlStub._fire()
    })

    expect(result.current).toBe(true)
  })

  it('updates to false when a resize event brings width to 768+', () => {
    setWindowWidth(375)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    act(() => {
      setWindowWidth(1024)
      mqlStub._fire()
    })

    expect(result.current).toBe(false)
  })

  it('registers a change listener on mount', () => {
    renderHook(() => useIsMobile())
    expect(mqlStub.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('removes the change listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(mqlStub.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('calls matchMedia with the correct query', () => {
    renderHook(() => useIsMobile())
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })

  it('returns a boolean (not undefined)', () => {
    setWindowWidth(500)
    const { result } = renderHook(() => useIsMobile())
    expect(typeof result.current).toBe('boolean')
  })
})
