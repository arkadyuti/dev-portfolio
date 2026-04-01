'use client'
import { useState } from 'react'
import Link from '@/components/ui/Link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { profile } from '@/data/profile-data'
import { mainNavItems, searchNavItem } from './nav-items'
import { StatusDot } from '@/components/fx/status-dot'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container-custom flex h-14 items-center justify-between">
        {/* Logo — terminal prompt style */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-mono text-sm font-medium tracking-tight"
          >
            <span className="text-primary">~</span>
            <span className="text-foreground">/dev</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-primary font-bold">portfolio</span>
          </Link>
          <span className="hidden sm:inline-flex">
            <StatusDot />
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {mainNavItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-3 font-mono text-xs font-normal text-muted-foreground hover:text-primary"
            >
              <Link href={item.href} className="flex items-center gap-1.5">
                <item.icon className="h-3.5 w-3.5" />
                {item.name.toLowerCase()}
              </Link>
            </Button>
          ))}
          <div className="mx-1 h-4 w-px bg-border/60" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
          >
            <Link href={searchNavItem.href} className="flex items-center">
              <searchNavItem.icon className="h-3.5 w-3.5" />
              <span className="sr-only">{searchNavItem.name}</span>
            </Link>
          </Button>
          <ThemeToggle />
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-1 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
          >
            <Link href={searchNavItem.href} className="flex items-center">
              <searchNavItem.icon className="h-4 w-4" />
              <span className="sr-only">{searchNavItem.name}</span>
            </Link>
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn('transition-transform duration-200', isMenuOpen ? 'rotate-90' : '')}
            >
              {isMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'overflow-hidden border-t border-border/30 transition-all duration-300 md:hidden',
          isMenuOpen ? 'max-h-80' : 'max-h-0 border-t-0'
        )}
      >
        <div className="container-custom flex flex-col gap-1 py-3">
          <div className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2">
            <StatusDot />
            <span className="font-mono text-xs text-muted-foreground">{profile.name}</span>
          </div>
          {mainNavItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              size="sm"
              className="w-full justify-start font-mono text-xs text-muted-foreground hover:text-primary"
              asChild
              onClick={() => setIsMenuOpen(false)}
            >
              <Link href={item.href} className="flex items-center gap-2">
                <span className="text-primary">{'>'}</span>
                <item.icon className="h-3.5 w-3.5" />
                {item.name.toLowerCase()}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </header>
  )
}
