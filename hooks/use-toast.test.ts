import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── module-level state isolation ──────────────────────────────────────────
// use-toast.ts keeps module-level state (memoryState, listeners, toastTimeouts).
// We re-import fresh between tests by clearing the module registry.

// Import the reducer directly (it's a pure function — easiest to test in isolation)
import { reducer } from '@/hooks/use-toast'

// ── reducer (pure unit tests) ─────────────────────────────────────────────

describe('use-toast reducer', () => {
  const emptyState = { toasts: [] }

  const makeToast = (id: string, open = true) => ({
    id,
    open,
    title: `Toast ${id}`,
  })

  it('ADD_TOAST adds a toast to the front', () => {
    const toast = makeToast('1')
    const next = reducer(emptyState, { type: 'ADD_TOAST', toast })
    expect(next.toasts).toHaveLength(1)
    expect(next.toasts[0].id).toBe('1')
  })

  it('ADD_TOAST enforces TOAST_LIMIT (1)', () => {
    const state1 = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const state2 = reducer(state1, { type: 'ADD_TOAST', toast: makeToast('2') })
    // Limit is 1 — only the newest toast survives
    expect(state2.toasts).toHaveLength(1)
    expect(state2.toasts[0].id).toBe('2')
  })

  it('UPDATE_TOAST merges partial data for matching id', () => {
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const next = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    })
    expect(next.toasts[0].title).toBe('Updated')
    expect(next.toasts[0].id).toBe('1')
  })

  it('UPDATE_TOAST leaves non-matching toasts unchanged', () => {
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const next = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: 'NONEXISTENT', title: 'Ghost' },
    })
    expect(next.toasts[0].title).toBe('Toast 1')
  })

  it('DISMISS_TOAST with id sets open=false for that toast', () => {
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const next = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' })
    expect(next.toasts[0].open).toBe(false)
  })

  it('DISMISS_TOAST without id sets open=false for all toasts', () => {
    // Start with one toast (limit enforced above, so only one is possible anyway)
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const next = reducer(state, { type: 'DISMISS_TOAST' })
    expect(next.toasts.every((t) => t.open === false)).toBe(true)
  })

  it('REMOVE_TOAST with id removes that specific toast', () => {
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const next = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' })
    expect(next.toasts).toHaveLength(0)
  })

  it('REMOVE_TOAST without id clears all toasts', () => {
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const next = reducer(state, { type: 'REMOVE_TOAST' })
    expect(next.toasts).toHaveLength(0)
  })

  it('REMOVE_TOAST with non-matching id leaves state unchanged', () => {
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const next = reducer(state, { type: 'REMOVE_TOAST', toastId: 'GHOST' })
    expect(next.toasts).toHaveLength(1)
  })

  it('does not mutate input state', () => {
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast: makeToast('1') })
    const originalToasts = state.toasts
    reducer(state, { type: 'DISMISS_TOAST', toastId: '1' })
    // original toasts array should be untouched
    expect(state.toasts).toBe(originalToasts)
    expect(state.toasts[0].open).toBe(true)
  })
})

// ── useToast hook (integration) ───────────────────────────────────────────
// Note: because memoryState is module-level, tests here share the same state
// unless we reset it. We use fake timers to prevent TOAST_REMOVE_DELAY side effects.

describe('useToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
  })

  it('renders without error', async () => {
    const { useToast } = await import('@/hooks/use-toast')
    const { result } = renderHook(() => useToast())
    expect(result.current).toBeDefined()
    expect(typeof result.current.toast).toBe('function')
    expect(typeof result.current.dismiss).toBe('function')
  })

  it('adds a toast and exposes it in state', async () => {
    const { useToast } = await import('@/hooks/use-toast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Hello' })
    })

    expect(result.current.toasts.some((t) => t.title === 'Hello')).toBe(true)
  })

  it('toast is open after being added', async () => {
    const { useToast } = await import('@/hooks/use-toast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Open Check' })
    })

    const t = result.current.toasts.find((t) => t.title === 'Open Check')
    expect(t?.open).toBe(true)
  })

  it('dismiss sets open=false on a specific toast', async () => {
    const { useToast } = await import('@/hooks/use-toast')
    const { result } = renderHook(() => useToast())

    let toastId: string | undefined
    act(() => {
      const ret = result.current.toast({ title: 'Dismiss Me' })
      toastId = ret.id
    })

    act(() => {
      result.current.dismiss(toastId)
    })

    const t = result.current.toasts.find((t) => t.id === toastId)
    expect(t?.open).toBe(false)
  })

  it('update changes toast properties', async () => {
    const { useToast } = await import('@/hooks/use-toast')
    const { result } = renderHook(() => useToast())

    let updateFn: ((props: any) => void) | undefined
    let toastId: string | undefined
    act(() => {
      const ret = result.current.toast({ title: 'Original' })
      toastId = ret.id
      updateFn = ret.update
    })

    act(() => {
      updateFn!({ id: toastId!, title: 'Updated' })
    })

    const t = result.current.toasts.find((t) => t.id === toastId)
    expect(t?.title).toBe('Updated')
  })
})
