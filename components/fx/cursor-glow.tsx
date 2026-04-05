'use client'

import { useEffect, useRef, useCallback } from 'react'

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const posRef = useRef({ x: 0, y: 0 })

  const updateGlow = useCallback(() => {
    const el = glowRef.current
    if (!el) return
    el.style.transform = `translate(${posRef.current.x - 300}px, ${posRef.current.y - 300}px)`
  }, [])

  useEffect(() => {
    const el = glowRef.current
    if (!el) return

    // Don't run on touch-only devices
    const isTouchOnly = window.matchMedia('(hover: none)').matches
    if (isTouchOnly) return

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateGlow)
      el.style.opacity = '1'
    }

    const onLeave = () => {
      el.style.opacity = '0'
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [updateGlow])

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed z-30 transition-opacity duration-500"
      style={{
        opacity: 0,
        width: 600,
        height: 600,
        top: 0,
        left: 0,
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsl(var(--glow) / 0.06), transparent 70%)',
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  )
}
