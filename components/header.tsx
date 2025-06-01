'use client'
import { useState } from 'react'
import Link from '@/components/ui/Link'
import { Home, FileText, User, Briefcase, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { profile } from '@/data/profile-data'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Blog', href: '/blogs', icon: FileText },
    { name: 'About', href: '/about', icon: User },
    { name: 'Projects', href: '/projects', icon: Briefcase },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container-custom flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-heading text-2xl font-bold">
            <span className="text-primary">Dev</span>Portfolio
            <span className="hidden items-center text-base font-medium text-muted-foreground sm:inline-flex">
              <span className="mx-2 text-border/50">|</span>
              {profile.name}
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Button key={item.name} variant="ghost" asChild className="text-base font-normal">
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          ))}
          <Button variant="ghost" size="icon">
            <Link href="/search" className="flex items-center">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>
          <ThemeToggle />
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
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
          'overflow-hidden transition-all duration-300 md:hidden',
          isMenuOpen ? 'max-h-64' : 'max-h-0'
        )}
      >
        <div className="container-custom flex flex-col gap-2 py-4">
          <div className="mb-2 border-b pb-2 text-sm font-medium text-muted-foreground">
            {profile.name}
          </div>
          {navItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className="w-full justify-start"
              asChild
              onClick={() => setIsMenuOpen(false)}
            >
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </Button>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start"
            asChild
            onClick={() => setIsMenuOpen(false)}
          >
            <Link href="/search" className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
