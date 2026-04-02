'use client'

import { useState, useEffect, useCallback } from 'react'

export interface TLine {
  text: string
  color?: string
  delay?: number // ms override for this specific line
}

interface TerminalLinesProps {
  lines: TLine[]
  speed?: number
  startDelay?: number
  cursor?: boolean
  className?: string
  onComplete?: () => void
}

export function TerminalLines({
  lines,
  speed = 100,
  startDelay = 0,
  cursor = true,
  className = '',
  onComplete,
}: TerminalLinesProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [started, setStarted] = useState(startDelay === 0)

  const handleComplete = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    if (startDelay === 0) return
    const t = setTimeout(() => setStarted(true), startDelay)
    return () => clearTimeout(t)
  }, [startDelay])

  useEffect(() => {
    if (!started) return
    if (visibleCount >= lines.length) {
      handleComplete()
      return
    }
    const delay = lines[visibleCount]?.delay ?? speed
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), delay)
    return () => clearTimeout(timer)
  }, [started, visibleCount, lines, speed, handleComplete])

  return (
    <div className={`font-mono text-xs leading-relaxed md:text-sm ${className}`}>
      {lines.slice(0, visibleCount).map((line, i) => (
        <div key={i} className={line.color || 'text-foreground/80'}>
          {line.text || '\u00A0'}
        </div>
      ))}
      {cursor && (
        <span className="inline-block h-3.5 w-1.5 translate-y-[1px] animate-blink bg-primary md:h-4" />
      )}
    </div>
  )
}

// Utility: build prompt lines from structured data
export function cmd(command: string): TLine {
  return { text: `$ ${command}`, color: 'text-terminal' }
}

export function out(text: string, color?: string): TLine {
  return { text, color: color || 'text-foreground' }
}

export function dim(text: string): TLine {
  return { text, color: 'text-muted-foreground' }
}

export function accent(text: string): TLine {
  return { text, color: 'text-primary' }
}

export function blank(delay?: number): TLine {
  return { text: '', color: '', delay }
}
