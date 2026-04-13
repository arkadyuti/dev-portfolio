'use client'

import { useReducer, useCallback, useMemo } from 'react'
import { executeCommand } from '@/lib/terminal/commands'
import { getGhostText, getSuggestions } from '@/lib/terminal/autocomplete'
import type { OutputLine, CommandResult } from '@/lib/terminal/types'

interface TerminalState {
  outputLines: OutputLine[]
  commandHistory: string[]
  historyIndex: number // -1 = typing new input
  currentInput: string
  savedInput: string // preserve input when navigating history
}

type TerminalAction =
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SUBMIT'; result: CommandResult }
  | { type: 'NAVIGATE_HISTORY'; direction: 'up' | 'down' }
  | { type: 'CLEAR' }
  | { type: 'ACCEPT_GHOST'; ghost: string }

function reducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, currentInput: action.value, historyIndex: -1 }

    case 'SUBMIT': {
      const input = state.currentInput.trim()
      if (!input) return state

      const { result } = action
      const commandLine: OutputLine = { text: `$ ${input}`, color: 'text-terminal' }
      const newHistory = [...state.commandHistory, input]

      if (result.type === 'action' && result.action === 'clear') {
        return {
          ...state,
          outputLines: [],
          commandHistory: newHistory,
          historyIndex: -1,
          currentInput: '',
          savedInput: '',
        }
      }

      const outputLines = result.type === 'output' ? result.lines : []

      return {
        ...state,
        outputLines: [...state.outputLines, commandLine, ...outputLines],
        commandHistory: newHistory,
        historyIndex: -1,
        currentInput: '',
        savedInput: '',
      }
    }

    case 'NAVIGATE_HISTORY': {
      const { commandHistory, historyIndex, currentInput, savedInput } = state
      if (commandHistory.length === 0) return state

      if (action.direction === 'up') {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
        return {
          ...state,
          historyIndex: newIndex,
          currentInput: commandHistory[newIndex],
          savedInput: historyIndex === -1 ? currentInput : savedInput,
        }
      } else {
        if (historyIndex === -1) return state
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          return { ...state, historyIndex: -1, currentInput: savedInput }
        }
        return { ...state, historyIndex: newIndex, currentInput: commandHistory[newIndex] }
      }
    }

    case 'CLEAR':
      return { ...state, outputLines: [] }

    case 'ACCEPT_GHOST':
      return { ...state, currentInput: state.currentInput + action.ghost, historyIndex: -1 }

    default:
      return state
  }
}

const initialState: TerminalState = {
  outputLines: [],
  commandHistory: [],
  historyIndex: -1,
  currentInput: '',
  savedInput: '',
}

export interface TerminalActionCallbacks {
  onNavigate?: (href: string) => void
  onMatrix?: () => void
}

export interface UseTerminalReturn {
  outputLines: OutputLine[]
  currentInput: string
  ghostText: string | null
  suggestions: string[]
  setInput: (value: string) => void
  submitCommand: () => CommandResult | null
  handleSubmit: () => void
  navigateHistory: (direction: 'up' | 'down') => void
  clearOutput: () => void
  acceptGhost: () => void
}

export function useTerminal(callbacks?: TerminalActionCallbacks): UseTerminalReturn {
  const [state, dispatch] = useReducer(reducer, initialState)

  const ghostText = useMemo(() => getGhostText(state.currentInput), [state.currentInput])
  const suggestions = useMemo(() => getSuggestions(state.currentInput), [state.currentInput])

  const setInput = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', value })
  }, [])

  const submitCommand = useCallback((): CommandResult | null => {
    const input = state.currentInput.trim()
    if (!input) return null

    const result = executeCommand(input, { history: state.commandHistory })
    dispatch({ type: 'SUBMIT', result })
    return result
  }, [state.currentInput, state.commandHistory])

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    dispatch({ type: 'NAVIGATE_HISTORY', direction })
  }, [])

  const clearOutput = useCallback(() => {
    dispatch({ type: 'CLEAR' })
  }, [])

  const acceptGhost = useCallback(() => {
    if (ghostText) {
      dispatch({ type: 'ACCEPT_GHOST', ghost: ghostText })
    }
  }, [ghostText])

  const handleSubmit = useCallback(() => {
    const result = submitCommand()
    if (!result) return
    if (result.type === 'action') {
      if (result.action === 'navigate' && result.payload) {
        callbacks?.onNavigate?.(result.payload)
      } else if (result.action === 'matrix') {
        callbacks?.onMatrix?.()
      }
    }
  }, [submitCommand, callbacks])

  return {
    outputLines: state.outputLines,
    currentInput: state.currentInput,
    ghostText,
    suggestions,
    setInput,
    submitCommand,
    handleSubmit,
    navigateHistory,
    clearOutput,
    acceptGhost,
  }
}
