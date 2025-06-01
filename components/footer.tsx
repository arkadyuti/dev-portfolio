'use client'
import { Github, Linkedin, Mail, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import Link from '@/components/ui/Link'
import { useState } from 'react'
import { logger } from '@/lib/logger'

export function Footer() {
  const [isLoading, setIsLoading] = useState(false)

  const socialLinks = [
    { name: 'Github', href: 'https://github.com', icon: Github },
    { name: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
    { name: 'Twitter', href: 'https://twitter.com', icon: Twitter },
    { name: 'Email', href: 'mailto:hello@example.com', icon: Mail },
  ]

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
    <footer className="border-t bg-background">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Link href="/" className="font-heading text-2xl font-bold">
              <span className="text-primary">Dev</span>Portfolio
            </Link>
            <p className="text-muted-foreground">
              Showcasing my journey and expertise as a frontend architect.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold">Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/" className="transition-colors hover:text-primary">
                Home
              </Link>
              <Link href="/blogs" className="transition-colors hover:text-primary">
                Blog
              </Link>
              <Link href="/about" className="transition-colors hover:text-primary">
                About
              </Link>
              <Link href="/projects" className="transition-colors hover:text-primary">
                Projects
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold">Newsletter</h3>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Stay updated with my latest articles and projects.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DevPortfolio. All rights reserved.
          </p>

          <div className="mt-4 flex items-center gap-4 md:mt-0">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-primary"
                aria-label={link.name}
              >
                <link.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
