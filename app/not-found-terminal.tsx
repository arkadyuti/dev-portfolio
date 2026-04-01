'use client'

import { useState, useEffect } from 'react'

const lines = [
  { text: '$ curl -s localhost/this-page', style: 'text-terminal' },
  { text: 'HTTP/1.1 404 Not Found', style: 'text-destructive' },
  { text: '', style: '' },
  { text: 'Error: ENOENT - no such file or directory', style: 'text-yellow-500' },
  { text: '  at FileSystem.read (/dev/portfolio/routes.ts:42)', style: 'text-muted-foreground' },
  { text: '', style: '' },
  { text: 'Looks like this page went out for coffee', style: 'text-foreground' },
  { text: 'and never came back.', style: 'text-foreground' },
  { text: '', style: '' },
  { text: '> Suggestion: try the homepage instead.', style: 'text-primary' },
]

export function NotFoundTerminal() {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount >= lines.length) return
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 180)
    return () => clearTimeout(timer)
  }, [visibleCount])

  return (
    <div className="p-4 font-mono text-xs leading-relaxed md:p-6 md:text-sm">
      {lines.slice(0, visibleCount).map((line, i) => (
        <div key={i} className={line.style}>
          {line.text || '\u00A0'}
        </div>
      ))}
      <span className="inline-block h-4 w-1.5 animate-blink bg-primary" />
    </div>
  )
}
