'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

export type WindowState = 'normal' | 'minimized' | 'maximized' | 'closed'

interface TerminalWindowProps {
  title: string
  children: ReactNode
  state: WindowState
  onStateChange: (state: WindowState) => void
  className?: string
  contentClassName?: string
}

export function TerminalWindow({
  title,
  children,
  state,
  onStateChange,
  className = '',
  contentClassName = '',
}: TerminalWindowProps) {
  const isMaximized = state === 'maximized'
  const isMinimized = state === 'closed' || state === 'minimized'

  // Normal / minimized view
  const windowContent = (
    <div
      className={cn(
        'terminal-block transition-all duration-300',
        className
      )}
    >
      <div
        className={cn(
          'terminal-header',
          isMinimized && 'cursor-pointer hover:bg-muted/70'
        )}
        onClick={isMinimized ? () => onStateChange('normal') : undefined}
        role={isMinimized ? 'button' : undefined}
        tabIndex={isMinimized ? 0 : undefined}
        onKeyDown={isMinimized ? (e) => e.key === 'Enter' && onStateChange('normal') : undefined}
      >
        <button
          type="button"
          className="terminal-dot bg-destructive/80 transition-all hover:brightness-125 hover:scale-125"
          onClick={(e) => {
            e.stopPropagation()
            onStateChange(isMinimized ? 'normal' : 'minimized')
          }}
          aria-label={isMinimized ? 'Restore window' : 'Minimize window'}
        />
        <button
          type="button"
          className="terminal-dot bg-yellow-500/80 transition-all hover:brightness-125 hover:scale-125"
          onClick={(e) => {
            e.stopPropagation()
            onStateChange(isMinimized ? 'normal' : 'minimized')
          }}
          aria-label={isMinimized ? 'Restore window' : 'Minimize window'}
        />
        <button
          type="button"
          className="terminal-dot bg-terminal/80 transition-all hover:brightness-125 hover:scale-125"
          onClick={(e) => {
            e.stopPropagation()
            onStateChange(isMaximized ? 'normal' : 'maximized')
          }}
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
        />
        <span className="ml-2 text-muted-foreground/60">{title}</span>
        {isMinimized && (
          <span className="ml-auto text-[10px] text-muted-foreground/40">click to expand</span>
        )}
      </div>

      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isMinimized ? 'max-h-0' : 'max-h-[2000px]',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )

  if (!isMaximized) return windowContent

  // Maximized = modal dialog
  return (
    <>
      {/* Keep the normal block in place so layout doesn't shift */}
      <div className={cn('terminal-block invisible', className)}>
        <div className="terminal-header">
          <span className="terminal-dot" />
          <span className="terminal-dot" />
          <span className="terminal-dot" />
          <span className="ml-2 text-muted-foreground/60">{title}</span>
        </div>
        <div className={contentClassName}>{children}</div>
      </div>

      {/* Modal overlay */}
      <DialogPrimitive.Root open onOpenChange={() => onStateChange('normal')}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-4xl max-h-[85vh] translate-x-[-50%] translate-y-[-50%] terminal-block border-primary/20 shadow-2xl flex flex-col"
          >
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            <div className="terminal-header">
              <button
                type="button"
                className="terminal-dot bg-destructive/80 transition-all hover:brightness-125 hover:scale-125"
                onClick={() => onStateChange('closed')}
                aria-label="Close window"
              />
              <button
                type="button"
                className="terminal-dot bg-yellow-500/80 transition-all hover:brightness-125 hover:scale-125"
                onClick={() => onStateChange('minimized')}
                aria-label="Minimize window"
              />
              <button
                type="button"
                className="terminal-dot bg-terminal/80 transition-all hover:brightness-125 hover:scale-125"
                onClick={() => onStateChange('normal')}
                aria-label="Restore window"
              />
              <span className="ml-2 text-muted-foreground/60">{title}</span>
              <button
                type="button"
                className="ml-auto text-muted-foreground/40 hover:text-foreground transition-colors"
                onClick={() => onStateChange('normal')}
                aria-label="Close modal"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className={cn('flex-1 overflow-y-auto', contentClassName)}>
              {children}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
