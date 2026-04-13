'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { TerminalInput } from '@/components/fx/terminal-input'
import { TerminalOutput } from '@/components/fx/terminal-output'
import { MatrixRain } from '@/components/fx/matrix-rain'
import { useTerminal } from '@/hooks/use-terminal'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [showMatrix, setShowMatrix] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [showBadge, setShowBadge] = useState(true)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMac((navigator as any).userAgentData?.platform === 'macOS' || /Macintosh/.test(navigator.userAgent))
  }, [])

  // Hide badge on scroll, show when back at top
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setShowBadge(window.scrollY < 100)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const terminal = useTerminal({
    onNavigate: (href) => { setOpen(false); router.push(href) },
    onMatrix: () => { setOpen(false); setShowMatrix(true) },
  })

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto-scroll on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [terminal.outputLines])

  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K'

  return (
    <>
      {showMatrix && <MatrixRain onDismiss={() => setShowMatrix(false)} />}

      {/* Fixed bottom-right badge — hidden on scroll and mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-lg border border-primary/20 bg-card/90 px-3 py-2 font-mono text-xs text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary sm:flex"
        style={{
          opacity: showBadge && !open ? 1 : 0,
          transform: showBadge && !open ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          pointerEvents: showBadge && !open ? 'auto' : 'none',
        }}
      >
        <kbd className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{shortcutLabel}</kbd>
        command palette
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[10%] z-50 w-[90vw] max-w-4xl translate-x-[-50%] terminal-block border-primary/20 shadow-2xl shadow-primary/5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%] duration-200"
          >
            <DialogPrimitive.Title className="sr-only">Command Palette</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Terminal command palette. Type commands and press Enter to execute.
            </DialogPrimitive.Description>

            <div className="terminal-header">
              <span className="terminal-dot bg-destructive/80" />
              <span className="terminal-dot bg-yellow-500/80" />
              <span className="terminal-dot bg-terminal/80" />
              <span className="ml-2 text-muted-foreground/60">command palette</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground/40">
                esc to close · {shortcutLabel} to toggle
              </span>
            </div>

            <div ref={scrollRef} className="flex min-h-[40vh] max-h-[70vh] flex-col justify-end overflow-y-auto overflow-x-hidden p-4 md:p-6">
              <TerminalOutput lines={terminal.outputLines} />
              <div className="mt-1">
                <TerminalInput
                  currentInput={terminal.currentInput}
                  ghostText={terminal.ghostText}
                  suggestions={terminal.suggestions}
                  setInput={terminal.setInput}
                  onSubmit={terminal.handleSubmit}
                  navigateHistory={terminal.navigateHistory}
                  acceptGhost={terminal.acceptGhost}
                  autoFocus
                />
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
