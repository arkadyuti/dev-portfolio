import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTerminal } from '@/hooks/use-terminal'
import { reducer } from '@/hooks/use-terminal'

// Re-export the internal reducer for direct unit testing via a workaround —
// since reducer is not exported, we test the hook's observable state instead.
// (The reducer itself is thoroughly exercised through the hook API.)

// ── useTerminal hook ──────────────────────────────────────────────────────

describe('useTerminal', () => {
  it('initialises with empty outputLines and currentInput', () => {
    const { result } = renderHook(() => useTerminal())
    expect(result.current.outputLines).toEqual([])
    expect(result.current.currentInput).toBe('')
  })

  it('setInput updates currentInput', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('hel') })
    expect(result.current.currentInput).toBe('hel')
  })

  it('ghostText is computed from currentInput', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('hel') })
    // "hel" -> ghost "p"
    expect(result.current.ghostText).toBe('p')
  })

  it('ghostText is null for empty input', () => {
    const { result } = renderHook(() => useTerminal())
    expect(result.current.ghostText).toBeNull()
  })

  it('suggestions array is non-empty for partial input', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('c') })
    expect(result.current.suggestions.length).toBeGreaterThan(0)
  })

  it('suggestions is empty for empty input', () => {
    const { result } = renderHook(() => useTerminal())
    expect(result.current.suggestions).toEqual([])
  })

  it('submitCommand returns null for empty input', () => {
    const { result } = renderHook(() => useTerminal())
    let ret: unknown
    act(() => { ret = result.current.submitCommand() })
    expect(ret).toBeNull()
  })

  it('submitCommand returns a result for valid command', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    let ret: unknown
    act(() => { ret = result.current.submitCommand() })
    expect(ret).not.toBeNull()
    expect((ret as any).type).toBe('output')
  })

  it('submitCommand clears currentInput', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    expect(result.current.currentInput).toBe('')
  })

  it('submitCommand appends command line to outputLines', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    const texts = result.current.outputLines.map((l) => l.text)
    expect(texts.some((t) => t.startsWith('$ '))).toBe(true)
  })

  it('clear action clears outputLines', () => {
    const { result } = renderHook(() => useTerminal())
    // First add some output
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    expect(result.current.outputLines.length).toBeGreaterThan(0)

    // "clear" command should empty outputLines
    act(() => { result.current.setInput('clear') })
    act(() => { result.current.submitCommand() })
    expect(result.current.outputLines).toEqual([])
  })

  it('clearOutput empties outputLines', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    act(() => { result.current.clearOutput() })
    expect(result.current.outputLines).toEqual([])
  })

  it('acceptGhost appends ghostText to currentInput', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('hel') })
    act(() => { result.current.acceptGhost() })
    expect(result.current.currentInput).toBe('help')
  })

  it('acceptGhost is a no-op when ghostText is null', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('zzznomatch') })
    act(() => { result.current.acceptGhost() })
    expect(result.current.currentInput).toBe('zzznomatch')
  })

  // ── history navigation ───────────────────────────────────────────────

  it('navigateHistory up has no effect when history is empty', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.navigateHistory('up') })
    expect(result.current.currentInput).toBe('')
  })

  it('navigateHistory up recalls last command', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    act(() => { result.current.navigateHistory('up') })
    expect(result.current.currentInput).toBe('pwd')
  })

  it('navigateHistory down after up restores original input', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    act(() => { result.current.setInput('typing') })
    act(() => { result.current.navigateHistory('up') })
    act(() => { result.current.navigateHistory('down') })
    expect(result.current.currentInput).toBe('typing')
  })

  it('navigateHistory down at bottom (-1 index) is a no-op', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('abc') })
    act(() => { result.current.navigateHistory('down') })
    expect(result.current.currentInput).toBe('abc')
  })

  it('multiple history entries navigable up', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    act(() => { result.current.setInput('whoami') })
    act(() => { result.current.submitCommand() })

    act(() => { result.current.navigateHistory('up') })
    expect(result.current.currentInput).toBe('whoami')

    act(() => { result.current.navigateHistory('up') })
    expect(result.current.currentInput).toBe('pwd')
  })

  // ── handleSubmit callbacks ────────────────────────────────────────────

  it('handleSubmit calls onNavigate for navigation commands', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() => useTerminal({ onNavigate }))
    act(() => { result.current.setInput('cd projects') })
    act(() => { result.current.handleSubmit() })
    expect(onNavigate).toHaveBeenCalledWith('/projects')
  })

  it('handleSubmit calls onMatrix for matrix command', () => {
    const onMatrix = vi.fn()
    const { result } = renderHook(() => useTerminal({ onMatrix }))
    act(() => { result.current.setInput('matrix') })
    act(() => { result.current.handleSubmit() })
    expect(onMatrix).toHaveBeenCalledTimes(1)
  })

  it('handleSubmit does not call onNavigate for output commands', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() => useTerminal({ onNavigate }))
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.handleSubmit() })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('handleSubmit is a no-op for empty input', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() => useTerminal({ onNavigate }))
    act(() => { result.current.handleSubmit() })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('history grows with each submitted command', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    act(() => { result.current.setInput('whoami') })
    act(() => { result.current.submitCommand() })

    // Navigate history twice and check both commands are there
    act(() => { result.current.navigateHistory('up') })
    expect(result.current.currentInput).toBe('whoami')
    act(() => { result.current.navigateHistory('up') })
    expect(result.current.currentInput).toBe('pwd')
  })

  it('history command uses the accumulated history context', () => {
    const { result } = renderHook(() => useTerminal())
    act(() => { result.current.setInput('pwd') })
    act(() => { result.current.submitCommand() })
    act(() => { result.current.setInput('history') })
    act(() => { result.current.submitCommand() })

    // The output should contain "pwd" as a history entry
    const texts = result.current.outputLines.map((l) => l.text).join('\n')
    expect(texts).toMatch(/pwd/)
  })
})
