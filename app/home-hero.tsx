'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { profile } from '@/data/profile-data'
import Link from '@/components/ui/Link'
import Image from 'next/image'
import { TypingEffect } from '@/components/fx/typing-effect'
import { StatusDot } from '@/components/fx/status-dot'

export function HeroSection() {
  const [showContent, setShowContent] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Stagger reveal after typing starts
    const timer = setTimeout(() => setShowContent(true), 800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const handleMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect()
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      })
    }

    section.addEventListener('mousemove', handleMove, { passive: true })
    return () => section.removeEventListener('mousemove', handleMove)
  }, [])

  return (
    <section ref={sectionRef} className="relative min-h-[85vh] overflow-hidden grid-bg">
      {/* Ambient glow that reacts to mouse */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(800px ellipse at ${mousePos.x * 100}% ${mousePos.y * 100}%, hsl(var(--primary) / 0.04), transparent 50%)`,
        }}
        aria-hidden="true"
      />

      {/* Corner accents */}
      <div className="pointer-events-none absolute left-0 top-0 h-32 w-32 border-l border-t border-primary/10" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 border-b border-r border-primary/10" aria-hidden="true" />

      <div className="container-custom flex min-h-[85vh] items-center py-20">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left column — Text content */}
          <div className="lg:col-span-7">
            {/* Terminal-style prefix */}
            <div className="mb-6 inline-flex items-center gap-3 rounded-md border border-border/40 bg-card/50 px-3 py-1.5 backdrop-blur-sm">
              <StatusDot label="available" />
              <span className="h-3 w-px bg-border/50" />
              <span className="font-mono text-[10px] text-muted-foreground">associate architect</span>
            </div>

            {/* Name with typing effect */}
            <h1 className="mb-4 font-heading text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              <TypingEffect
                text="Arkadyuti Sarkar"
                speed={55}
                className="text-primary"
                cursor={true}
              />
            </h1>

            {/* Title */}
            <h2
              className="mb-6 text-xl font-medium text-foreground/80 md:text-2xl"
              style={{
                opacity: showContent ? 1 : 0,
                transform: showContent ? 'none' : 'translateY(10px)',
                transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
              }}
            >
              {profile.title}
            </h2>

            {/* Bio */}
            <p
              className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
              style={{
                opacity: showContent ? 1 : 0,
                transform: showContent ? 'none' : 'translateY(10px)',
                transition: 'opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s',
              }}
            >
              {profile.bio}
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-wrap gap-3"
              style={{
                opacity: showContent ? 1 : 0,
                transform: showContent ? 'none' : 'translateY(10px)',
                transition: 'opacity 0.6s ease 0.6s, transform 0.6s ease 0.6s',
              }}
            >
              <Button size="lg" asChild className="font-mono text-xs">
                <Link href="/projects">View My Work</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-border/50 font-mono text-xs"
              >
                <Link href="/about">About Me</Link>
              </Button>
            </div>
          </div>

          {/* Right column — Profile Image */}
          <div
            className="flex justify-center lg:col-span-5 lg:justify-end"
            style={{
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'none' : 'translateY(20px)',
              transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
            }}
          >
            <div className="relative w-full max-w-sm">
              {/* Glow behind image */}
              <div
                className="absolute -inset-4 rounded-2xl opacity-30 blur-3xl"
                style={{
                  background: `radial-gradient(ellipse at ${mousePos.x * 100}% ${mousePos.y * 100}%, hsl(var(--primary) / 0.3), transparent 70%)`,
                }}
                aria-hidden="true"
              />

              {/* Image wrapper with terminal-style frame */}
              <div className="terminal-block relative">
                <div className="terminal-header">
                  <span className="terminal-dot bg-destructive/80" />
                  <span className="terminal-dot bg-yellow-500/80" />
                  <span className="terminal-dot bg-terminal/80" />
                  <span className="ml-2 text-muted-foreground/60">profile.jpg</span>
                </div>
                <div className="scanline relative overflow-hidden">
                  <Image
                    src={profile.profileImage}
                    alt={`${profile.name} - ${profile.title} specializing in React, TypeScript, and AI development`}
                    width={400}
                    height={400}
                    className="aspect-square w-full object-cover"
                    loading="eager"
                    priority={true}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LS0yMi4qLjgyPj4+Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojr/2wBDAR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>
              </div>

              {/* Floating data labels — hidden on small screens */}
              <div className="absolute -right-2 top-1/4 hidden rounded-md border border-border/40 bg-card/80 px-2.5 py-1 font-mono text-[10px] backdrop-blur-sm sm:block">
                <span className="text-muted-foreground">exp:</span>{' '}
                <span className="text-primary">9+ yrs</span>
              </div>
              <div className="absolute -left-2 bottom-1/4 hidden rounded-md border border-border/40 bg-card/80 px-2.5 py-1 font-mono text-[10px] backdrop-blur-sm sm:block">
                <span className="text-muted-foreground">focus:</span>{' '}
                <span className="text-terminal">AI agents</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
