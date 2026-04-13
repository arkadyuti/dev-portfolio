'use client'

import { useRef, useEffect, useState, type KeyboardEvent } from 'react'

interface TerminalInputProps {
  currentInput: string
  ghostText: string | null
  suggestions: string[]
  setInput: (value: string) => void
  onSubmit: () => void
  navigateHistory: (direction: 'up' | 'down') => void
  acceptGhost: () => void
  autoFocus?: boolean
}

export function TerminalInput({
  currentInput,
  ghostText,
  suggestions,
  setInput,
  onSubmit,
  navigateHistory,
  acceptGhost,
  autoFocus = false,
}: TerminalInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay so the DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0 && currentInput.length > 0)
    setSelectedSuggestion(0)
  }, [suggestions, currentInput])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setInput(suggestions[selectedSuggestion])
        setShowSuggestions(false)
      } else {
        setShowSuggestions(false)
        onSubmit()
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setInput(suggestions[selectedSuggestion])
        setShowSuggestions(false)
      } else if (ghostText) {
        acceptGhost()
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
      } else {
        navigateHistory('up')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
      } else {
        navigateHistory('down')
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="relative font-mono text-xs md:text-sm">
      <div className="flex items-center gap-2">
        <span className="text-terminal select-none">$</span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent font-mono text-xs text-foreground outline-none caret-primary md:text-sm"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Terminal input"
          />
          {/* Ghost autocomplete text */}
          {ghostText && (
            <span
              className="pointer-events-none absolute left-0 top-0 flex h-full items-center font-mono text-xs text-muted-foreground/30 md:text-sm"
              aria-hidden="true"
            >
              <span className="invisible">{currentInput}</span>
              <span>{ghostText}</span>
            </span>
          )}
        </div>
      </div>

      {showSuggestions && (
        <div className="absolute bottom-full left-4 z-20 mb-1 max-w-xs overflow-hidden rounded border border-border/60 bg-card/98 shadow-lg backdrop-blur-sm">
          {suggestions.map((suggestion, i) => (
            <button
              key={suggestion}
              type="button"
              className={`block w-full px-3 py-1.5 text-left font-mono text-xs transition-colors ${
                i === selectedSuggestion
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground/70 hover:bg-muted/50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                setInput(suggestion)
                setShowSuggestions(false)
                inputRef.current?.focus()
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
