'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { profile } from '@/data/profile-data'
import Link from '@/components/ui/Link'
import Image from 'next/image'
import { cmd, out, dim, accent, blank, type TLine } from '@/components/fx/terminal-lines'
import { TerminalInput } from '@/components/fx/terminal-input'
import { TerminalOutput } from '@/components/fx/terminal-output'
import { TerminalWindow, type WindowState } from '@/components/fx/terminal-window'
import { useTerminal } from '@/hooks/use-terminal'
import { MatrixRain } from '@/components/fx/matrix-rain'
import { cn } from '@/lib/utils'

// Break bio into lines that fit terminal width (~70 chars)
function wrapText(text: string, maxLen = 72): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (current.length + word.length + 1 > maxLen) {
      lines.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) lines.push(current)
  return lines
}


export function HeroSection() {
  const router = useRouter()
  const [showMatrix, setShowMatrix] = useState(false)
  const [mainWindow, setMainWindow] = useState<WindowState>('normal')
  const [profileWindow, setProfileWindow] = useState<WindowState>('normal')
  const scrollRef = useRef<HTMLDivElement>(null)

  const terminalCallbacks = useMemo(() => ({
    onNavigate: (href: string) => router.push(href),
    onMatrix: () => setShowMatrix(true),
  }), [router])
  const terminal = useTerminal(terminalCallbacks)


  const terminalContent = useMemo(() => {
    const bioLines = wrapText(profile.bio)
    return [
      cmd('ssh arka@dev.portfolio'),
      dim('Connection established.'),
      blank(80),
      cmd('whoami'),
      out(profile.name, 'text-primary font-bold text-base md:text-lg'),
      blank(60),
      cmd('cat ./role'),
      out(profile.title),
      blank(60),
      cmd('uptime'),
      { text: '● available · 9+ years · focus: AI agents', color: 'text-terminal' },
      blank(80),
      cmd('head ./README.md'),
      ...bioLines.map((line) => dim(line)),
      blank(100),
      cmd('ls ./'),
      accent('  projects/   blogs/   about.md   resume.pdf'),
      blank(),
    ]
  }, [])


  // Auto-scroll terminal output to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [terminal.outputLines])

  const mainMaximized = mainWindow === 'maximized'

  return (
    <section className="relative min-h-[85vh] grid-bg">
      {showMatrix && <MatrixRain onDismiss={() => setShowMatrix(false)} />}

      {/* Corner accents */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-24 w-24 border-l border-t border-primary/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 border-b border-r border-primary/10"
        aria-hidden="true"
      />

      <div className="container-custom flex min-h-[85vh] items-center py-16 md:py-20">
        <div className="grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left — Terminal Session */}
          <div
            className={cn(
              'transition-all duration-300',
              mainMaximized ? 'lg:col-span-12' : 'lg:col-span-7'
            )}
          >
            <TerminalWindow
              title="arka@portfolio: ~"
              state={mainWindow}
              onStateChange={setMainWindow}
            >
              <div
                ref={scrollRef}
                className="max-h-[600px] overflow-y-auto p-4 md:p-6 cursor-text"
                onClick={() => {
                  const input = scrollRef.current?.querySelector<HTMLInputElement>('[aria-label="Terminal input"]')
                  input?.focus()
                }}
              >
                {/* Boot sequence — static */}
                <div className="font-mono text-xs leading-relaxed md:text-sm">
                  {terminalContent.map((line, i) => (
                    <div key={i} className={line.color || 'text-foreground/80'}>
                      {line.text || '\u00A0'}
                    </div>
                  ))}
                </div>

                {/* Interactive terminal output + input */}
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
            </TerminalWindow>

            {/* Navigation commands */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="lg" asChild className="font-mono text-xs">
                <Link href="/projects">ls ./projects</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-border/50 font-mono text-xs"
              >
                <Link href="/blogs">tail ./posts</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-border/50 font-mono text-xs"
              >
                <Link href="/about">cat ./about</Link>
              </Button>
            </div>
          </div>

          {/* Right — Profile Image */}
          <div
            className={cn(
              'flex justify-center lg:justify-end lg:col-span-5',
              mainMaximized && 'hidden lg:hidden'
            )}
          >
            <div className="w-full max-w-xs lg:max-w-sm">
              <TerminalWindow
                title="feh profile.jpg"
                state={profileWindow}
                onStateChange={setProfileWindow}
              >
                <div className="scanline relative overflow-hidden">
                  <Image
                    src={profile.profileImage}
                    alt={`${profile.name} - ${profile.title}`}
                    width={400}
                    height={400}
                    sizes="(max-width: 1024px) 280px, 384px"
                    className="aspect-square w-full object-cover object-top"
                    loading="eager"
                    priority={true}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIBAAAgIBBAMBAAAAAAAAAAAAAQIAAwQRITFBBRIiUf/EABUBAQEAAAAAAAAAAAAAAAAAAAME/8QAGBEAAwEBAAAAAAAAAAAAAAAAABEhAQL/2gAMAwEAAhEDEQA/ANEzeLx8lQ1iEMBsdjMr5T"
                  />
                </div>
              </TerminalWindow>

              {/* Metadata below image */}
              <div className="mt-3 flex items-center justify-between px-1 font-mono text-[10px] text-muted-foreground">
                <span>
                  <span className="text-primary">exp:</span> 9+ yrs
                </span>
                <span>
                  <span className="text-terminal">focus:</span> AI agents
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
