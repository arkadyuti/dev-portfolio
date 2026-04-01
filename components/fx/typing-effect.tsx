'use client'

import { useState, useEffect, useRef } from 'react'

interface TypingEffectProps {
  text: string
  speed?: number
  delay?: number
  className?: string
  cursor?: boolean
  onComplete?: () => void
}

export function TypingEffect({
  text,
  speed = 45,
  delay = 0,
  className = '',
  cursor = true,
  onComplete,
}: TypingEffectProps) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  useEffect(() => {
    if (!started) return

    const interval = setInterval(() => {
      indexRef.current += 1
      if (indexRef.current > text.length) {
        clearInterval(interval)
        setDone(true)
        onComplete?.()
        return
      }
      setDisplayed(text.slice(0, indexRef.current))
    }, speed)

    return () => clearInterval(interval)
  }, [started, text, speed, onComplete])

  return (
    <span className={className}>
      {displayed}
      {cursor && (
        <span
          className={`ml-0.5 inline-block h-[1em] w-[3px] translate-y-[2px] bg-primary ${done ? 'animate-blink' : ''}`}
          aria-hidden="true"
        />
      )}
    </span>
  )
}
