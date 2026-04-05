'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { profile } from '@/data/profile-data'
import Link from '@/components/ui/Link'
import Image from 'next/image'
import { TerminalLines, cmd, out, dim, accent, blank } from '@/components/fx/terminal-lines'

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
  const [sessionReady, setSessionReady] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [showNav, setShowNav] = useState(false)

  const bioLines = wrapText(profile.bio)

  const terminalContent = [
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

  const handleSessionComplete = useCallback(() => {
    setSessionReady(true)
    setTimeout(() => setShowNav(true), 300)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShowImage(true), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative min-h-[85vh] grid-bg">
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
          <div className="lg:col-span-7">
            <div className="terminal-block">
              <div className="terminal-header">
                <span className="terminal-dot bg-destructive/80" />
                <span className="terminal-dot bg-yellow-500/80" />
                <span className="terminal-dot bg-terminal/80" />
                <span className="ml-2 text-muted-foreground/60">arka@portfolio: ~</span>
              </div>
              <div className="p-4 md:p-6">
                <TerminalLines
                  lines={terminalContent}
                  speed={70}
                  startDelay={300}
                  onComplete={handleSessionComplete}
                />
              </div>
            </div>

            {/* Navigation commands — appear after session completes */}
            <div
              className="mt-4 flex flex-wrap gap-3"
              style={{
                opacity: showNav ? 1 : 0,
                transform: showNav ? 'none' : 'translateY(8px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
              }}
            >
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
            className="flex justify-center lg:col-span-5 lg:justify-end"
            style={{
              opacity: showImage ? 1 : 0,
              transform: showImage ? 'none' : 'translateY(16px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            <div className="w-full max-w-xs lg:max-w-sm">
              <div className="terminal-block">
                <div className="terminal-header">
                  <span className="terminal-dot bg-destructive/80" />
                  <span className="terminal-dot bg-yellow-500/80" />
                  <span className="terminal-dot bg-terminal/80" />
                  <span className="ml-2 text-muted-foreground/60">feh profile.jpg</span>
                </div>
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
              </div>

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
