'use client'

interface StatusDotProps {
  label?: string
  className?: string
}

export function StatusDot({ label = 'online', className = '' }: StatusDotProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terminal opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-terminal" />
      </span>
      <span className="text-terminal">{label}</span>
    </span>
  )
}
