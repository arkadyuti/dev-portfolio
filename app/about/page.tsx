import { Github, Linkedin, Mail, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { profile } from '@/data/profile-data'
import Image from 'next/image'
import { Metadata } from 'next'
import {
  genPageMetadata,
  generatePersonStructuredData,
  generateBreadcrumbStructuredData,
} from '../seo'
import Script from 'next/script'
import siteMetadata from '@/data/siteMetadata'
import { StatusDot } from '@/components/fx/status-dot'

export const metadata: Metadata = genPageMetadata({
  title: `About ${profile.name} | ${profile.title} | Skills & Experience`,
  description: profile.aboutPageMetadata.description,
  keywords: profile.aboutPageMetadata.keywords,
})

const AboutPage = () => {
  const socialLinks = [
    { name: 'gh auth', href: profile.socialLinks.github, icon: Github },
    { name: 'linkedin', href: profile.socialLinks.linkedin, icon: Linkedin },
    { name: 'twitter', href: profile.socialLinks.twitter, icon: Twitter },
    { name: 'mailto:', href: profile.socialLinks.email, icon: Mail },
  ]

  const bioContentParagraphs = profile.longBio.split('\n\n').map((paragraph, index) => {
    if (paragraph.startsWith('# ')) {
      return (
        <h1 key={index} className="mb-3 mt-8 font-mono text-lg font-bold text-primary md:text-xl">
          {paragraph.substring(2)}
        </h1>
      )
    } else if (paragraph.startsWith('## ')) {
      return (
        <h2 key={index} className="mb-3 mt-6 font-mono text-base font-bold text-primary/80 md:text-lg">
          {paragraph.substring(3)}
        </h2>
      )
    } else if (paragraph.startsWith('### ')) {
      return (
        <h3 key={index} className="mb-2 mt-5 font-mono text-sm font-bold text-primary/70">
          {paragraph.substring(4)}
        </h3>
      )
    } else if (paragraph.startsWith('- ')) {
      const items = paragraph.split('\n').map((item) => item.substring(2))
      return (
        <ul key={index} className="mb-4 mt-2 space-y-1 pl-4">
          {items.map((item, i) => (
            <li key={i} className="font-mono text-xs text-foreground/80 before:mr-2 before:text-muted-foreground before:content-['-']">
              {item}
            </li>
          ))}
        </ul>
      )
    } else {
      return (
        <p key={index} className="mb-4 text-sm leading-relaxed text-foreground/80">
          {paragraph}
        </p>
      )
    }
  })

  const allSkills = profile.skills.flatMap((category) => category.items)
  const personStructuredData = generatePersonStructuredData({
    name: profile.name,
    title: profile.title,
    description: profile.bio,
    image: profile.profileImage,
    url: '/about',
    sameAs: [profile.socialLinks.github, profile.socialLinks.linkedin, profile.socialLinks.twitter],
    skills: allSkills.slice(0, 20),
    worksFor: { name: 'Tekion', url: 'https://tekion.com' },
  })

  const breadcrumbStructuredData = generateBreadcrumbStructuredData({
    items: [
      { name: 'Home', url: siteMetadata.siteUrl },
      { name: 'About', url: `${siteMetadata.siteUrl}/about` },
    ],
  })

  return (
    <>
      <Script
        id="person-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: personStructuredData }}
      />
      <Script
        id="breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbStructuredData }}
      />

      {/* Bio section */}
      <section className="relative grid-bg py-12 md:py-20">
        <div className="container-custom max-w-5xl">
          <div className="mb-8 font-mono text-xs text-terminal md:text-sm">
            $ cat ./about.md
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Main content — terminal block */}
            <div className="order-2 lg:order-1 lg:col-span-8">
              <div className="terminal-block">
                <div className="terminal-header">
                  <span className="terminal-dot bg-destructive/80" />
                  <span className="terminal-dot bg-yellow-500/80" />
                  <span className="terminal-dot bg-terminal/80" />
                  <span className="ml-2 text-muted-foreground/60">about.md</span>
                </div>
                <div className="p-4 md:p-6">
                  <h1 className="mb-6 font-mono text-2xl font-bold text-primary md:text-3xl">
                    About Me
                  </h1>
                  <div className="max-w-none">{bioContentParagraphs}</div>

                  {/* Social links */}
                  <div className="mt-8 border-t border-border/30 pt-6">
                    <div className="mb-3 font-mono text-xs text-terminal">$ cat ./links.txt</div>
                    <div className="flex flex-wrap gap-2">
                      {socialLinks.map((link) => (
                        <Button
                          key={link.name}
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-7 border-border/50 font-mono text-[10px]"
                        >
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5"
                          >
                            <link.icon className="h-3 w-3" />
                            {link.name}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="order-1 lg:order-2 lg:col-span-4">
              <div className="sticky top-24 space-y-4">
                {/* Profile image */}
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
                      alt={`${profile.name} - Professional photo of ${profile.title}`}
                      className="h-auto w-full object-cover"
                      width={400}
                      height={400}
                      priority
                    />
                  </div>
                </div>

                {/* Identity card */}
                <div className="terminal-block">
                  <div className="terminal-header">
                    <span className="terminal-dot bg-destructive/80" />
                    <span className="terminal-dot bg-yellow-500/80" />
                    <span className="terminal-dot bg-terminal/80" />
                    <span className="ml-2 text-muted-foreground/60">id</span>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-terminal">$ id</span>
                      <StatusDot label="available" />
                    </div>
                    <h2 className="font-mono text-lg font-bold">{profile.name}</h2>
                    <p className="font-mono text-xs text-muted-foreground">{profile.title}</p>

                    <div className="mt-4 border-t border-border/30 pt-3">
                      <span className="font-mono text-[10px] text-terminal">
                        $ env | grep STACK
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.skills.slice(0, 3).flatMap((category) =>
                          category.items.slice(0, 2).map((skill, idx) => (
                            <Badge
                              key={`${category.category}-${idx}`}
                              variant="outline"
                              className="border-border/40 font-mono text-[10px]"
                            >
                              {skill}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    <Button className="mt-4 w-full font-mono text-xs" size="sm" asChild>
                      <a href={profile.socialLinks.email}>open mailto:</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills section — config table format */}
      <section className="relative grid-bg py-12 md:py-20">
        <div className="container-custom max-w-5xl">
          <div className="mb-8 font-mono text-xs text-terminal md:text-sm">
            $ dpkg --list --installed
          </div>

          <div className="terminal-block">
            <div className="terminal-header">
              <span className="terminal-dot bg-destructive/80" />
              <span className="terminal-dot bg-yellow-500/80" />
              <span className="terminal-dot bg-terminal/80" />
              <span className="ml-2 text-muted-foreground/60">installed_packages.conf</span>
            </div>
            <div className="p-4 md:p-6">
              <div className="config-table">
                {profile.skills.map((cat) => (
                  <div key={cat.category} className="config-row">
                    <div className="config-header">
                      <span className="config-key">
                        {cat.category.toLowerCase().replace(/\s+&\s+/g, '_').replace(/\s+/g, '_')}
                      </span>
                      <span className="config-sep">=</span>
                    </div>
                    <span className="config-val">{cat.items.join(', ')}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 font-mono text-xs text-muted-foreground">
                {allSkills.length} packages across {profile.skills.length} categories.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default AboutPage
