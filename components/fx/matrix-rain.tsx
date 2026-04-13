'use client'

import { useEffect, useRef, useCallback } from 'react'

interface MatrixRainProps {
  onDismiss: () => void
}

export function MatrixRain({ onDismiss }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const dismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = new Array(columns).fill(1)

    // Mix of katakana and latin characters
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

    let lastFrame = 0
    const targetFps = 30
    const frameInterval = 1000 / targetFps

    const draw = (timestamp: number) => {
      if (timestamp - lastFrame < frameInterval) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }
      lastFrame = timestamp

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#0F0'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]

        // Lead character is brighter
        if (Math.random() > 0.5) {
          ctx.fillStyle = '#0F0'
        } else {
          ctx.fillStyle = '#00CC00'
        }

        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    // Auto-dismiss after 15 seconds
    const autoClose = setTimeout(dismiss, 15000)

    // Dismiss on keypress — delay to avoid the Enter that triggered the command
    let armed = false
    const armTimer = setTimeout(() => { armed = true }, 500)
    const handleKey = (e: KeyboardEvent) => {
      if (armed) dismiss()
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(autoClose)
      clearTimeout(armTimer)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', resize)
    }
  }, [dismiss])

  return (
    <div
      className="fixed inset-0 z-50 cursor-pointer"
      onClick={dismiss}
      role="button"
      tabIndex={0}
      aria-label="Click to dismiss Matrix rain"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-green-500/60">
        Click anywhere or press any key to exit
      </div>
    </div>
  )
}
