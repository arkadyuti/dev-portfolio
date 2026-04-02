'use client'
import { Github, Linkedin, Mail, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import Link from '@/components/ui/Link'
import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { profile } from '@/data/profile-data'

interface BuildInfo {
  version: string
  buildNumber: number
  buildTime: string
  buildTimestamp: number
}

export function Footer() {
  const [isLoading, setIsLoading] = useState(false)
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null)

  const socialLinks = [
    { name: 'Github', href: profile.socialLinks.github, icon: Github },
    { name: 'LinkedIn', href: profile.socialLinks.linkedin, icon: Linkedin },
    { name: 'Twitter', href: profile.socialLinks.twitter, icon: Twitter },
    { name: 'Email', href: profile.socialLinks.email, icon: Mail },
  ]

  useEffect(() => {
    // Fetch build info
    fetch('/build-info.json')
      .then((res) => res.json())
      .then((data) => setBuildInfo(data))
      .catch(() => {
        // build-info.json only exists in production — silent fallback in dev
        const now = new Date()
        setBuildInfo({
          version: '1.0.1',
          buildNumber: Math.floor(now.getTime() / 1000),
          buildTime: now.toISOString(),
          buildTimestamp: now.getTime(),
        })
      })
  }, [])

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const emailInput = form.elements.namedItem('email') as HTMLInputElement
    const email = emailInput.value

    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || 'Successfully subscribed to the newsletter')
        form.reset()
      } else {
        toast.error(data.message || 'Failed to subscribe to the newsletter')
      }
    } catch (error) {
      logger.error('Error subscribing to newsletter', error)
      toast.error('Failed to subscribe to the newsletter')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-sm font-medium"
            >
              <span className="text-terminal">arka</span><span className="text-muted-foreground">@</span><span className="text-primary">portfolio</span><span className="text-muted-foreground">:~</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Showcasing my journey and expertise as a frontend architect.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
              # sitemap
            </h3>
            <nav className="flex flex-col space-y-2">
              {[
                { name: 'home', href: '/' },
                { name: 'blog', href: '/blogs' },
                { name: 'about', href: '/about' },
                { name: 'projects', href: '/projects' },
                { name: 'resume', href: '/resume' },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="group inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <span className="text-border transition-colors group-hover:text-primary">
                    {'>'}
                  </span>
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
              # subscribe
            </h3>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Stay updated with my latest articles and projects.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  className="flex-1 border-border/50 bg-muted/30 font-mono text-sm backdrop-blur-sm focus:border-primary/50"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  size="sm"
                  className="font-mono text-xs"
                >
                  {isLoading ? '...' : '>>'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-6 md:flex-row">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="font-mono text-xs text-muted-foreground/70">
              # built with passion for open source
            </p>
            {buildInfo && (
              <p className="font-mono text-[10px] text-muted-foreground/40">
                pid {buildInfo.buildNumber} · v{buildInfo.version}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-muted-foreground/60 transition-all hover:text-primary"
                aria-label={link.name}
              >
                <link.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
