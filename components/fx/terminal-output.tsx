'use client'

import Link from 'next/link'
import type { OutputLine } from '@/lib/terminal/types'

const LINE_CLASS = 'font-mono text-xs leading-relaxed md:text-sm'

interface TerminalOutputProps {
  lines: OutputLine[]
}

export function TerminalOutput({ lines }: TerminalOutputProps) {
  return (
    <>
      {lines.map((line, i) => {
        if (line.isHtml) {
          return (
            <div
              key={i}
              className={`${LINE_CLASS} ${line.color || 'text-foreground/80'}`}
              dangerouslySetInnerHTML={{ __html: line.text || '\u00A0' }}
            />
          )
        }

        if (line.href) {
          const isExternal = line.href.startsWith('http') || line.href.startsWith('mailto:')
          return (
            <div key={i} className={LINE_CLASS}>
              {isExternal ? (
                <a
                  href={line.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${line.color || 'text-primary'} underline-offset-2 hover:underline`}
                >
                  {line.text}
                </a>
              ) : (
                <Link
                  href={line.href}
                  className={`${line.color || 'text-primary'} underline-offset-2 hover:underline`}
                >
                  {line.text}
                </Link>
              )}
            </div>
          )
        }

        return (
          <div
            key={i}
            className={`${LINE_CLASS} ${line.color || 'text-foreground/80'}`}
          >
            {line.text || '\u00A0'}
          </div>
        )
      })}
    </>
  )
}
