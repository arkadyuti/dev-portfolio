import { ArrowRight, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { profile } from '@/data/profile-data'
import Link from '@/components/ui/Link'
import Image from 'next/image'
import ProjectModels, { transformToProjects } from 'models/project'
import BlogModels, { transformToBlogs } from 'models/blog'
import connectToDatabase from '@/lib/mongodb'
import { logger } from '@/lib/logger'
import { generatePersonStructuredData, genPageMetadata, generateWebsiteStructuredData } from './seo'
import siteMetadata from '@/data/siteMetadata'
import Script from 'next/script'
import { Metadata } from 'next'
import { HeroSection } from './home-hero'

// Explicitly mark page as server component
export const dynamic = 'force-dynamic'

// Generate metadata for homepage
export async function generateMetadata(): Promise<Metadata> {
  return genPageMetadata({
    title: `${profile.name} | ${profile.title} | React, TypeScript, AI Expert`,
    description: profile.bio,
    keywords: `${profile.name}, Associate Architect, Tekion, AI Developer Workflows, Model Context Protocol, MCP, Enterprise Architecture, CI/CD Optimization, React Expert, TypeScript, Portfolio, Full-Stack Developer, LangChain, RAG, AI Engineering`,
    type: 'website',
  })
}

// Server-side data fetching
async function getFeaturedProjects() {
  try {
    await connectToDatabase()
    const projects = await ProjectModels.find({ featured: true, isDraft: false })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean()

    return transformToProjects(projects)
  } catch (error) {
    logger.error('Error fetching featured projects', error)
    return []
  }
}

// Server-side data fetching for recent blog posts
async function getRecentBlogPosts() {
  try {
    await connectToDatabase()
    const blogs = await BlogModels.find({ isDraft: false })
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean()

    return transformToBlogs(blogs)
  } catch (error) {
    logger.error('Error fetching recent blog posts', error)
    return []
  }
}

export default async function Home() {
  const featuredProjects = await getFeaturedProjects()
  const recentPosts = await getRecentBlogPosts()

  // Generate structured data for the person
  const allSkills = profile.skills.flatMap((category) => category.items)
  const personStructuredData = generatePersonStructuredData({
    name: profile.name,
    title: profile.title,
    description: profile.bio,
    image: profile.profileImage,
    url: siteMetadata.siteUrl,
    sameAs: [siteMetadata.github, siteMetadata.linkedin, siteMetadata.x].filter(Boolean),
    skills: allSkills.slice(0, 20), // Top 20 skills
    worksFor: { name: 'Tekion', url: 'https://tekion.com' },
  })

  // Generate structured data for the website
  const websiteStructuredData = generateWebsiteStructuredData({
    name: siteMetadata.title,
    url: siteMetadata.siteUrl,
    description: siteMetadata.description,
    author: profile.name,
  })

  return (
    <>
      {/* Add structured data for person */}
      <Script
        id="person-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: personStructuredData }}
      />
      {/* Add structured data for website */}
      <Script
        id="website-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteStructuredData }}
      />

      {/* Hero Section — interactive client component */}
      <HeroSection />

      {/* Tech Stack Section */}
      <section className="relative grid-bg py-20">
        <div className="container-custom">
          <div className="glass-card rounded-xl border border-border/30 p-6 md:p-10">
            <div className="mb-12 flex flex-col items-center text-center">
              <span className="mono-label mb-3">// systems.check</span>
              <h2 className="section-heading mx-auto text-center">My Tech Stack</h2>
              <p className="mx-auto max-w-xl text-muted-foreground">
                These are the technologies I work with on a daily basis to build modern, performant
                web applications.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {profile.skills
                .flatMap((category) =>
                  category.items
                    .slice(0, category.items.length >= 3 ? 3 : category.items.length)
                    .map((skill, idx) => (
                      <div
                        key={`${category.category}-${idx}`}
                        className="tech-stack-item group"
                      >
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md border border-border/50 bg-primary/5 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                          <span className="font-mono text-xs font-bold text-primary">
                            {skill.charAt(0)}
                          </span>
                        </div>
                        <h3 className="text-xs font-medium">{skill}</h3>
                        <p className="font-mono text-[10px] text-muted-foreground/60">
                          {category.category}
                        </p>
                      </div>
                    ))
                )
                .slice(0, 15)}
            </div>

            <div className="mt-10 text-center">
              <Button
                variant="outline"
                asChild
                className="group border-border/50 font-mono text-xs"
              >
                <Link href="/about" className="flex items-center gap-2">
                  View All Technologies{' '}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="relative grid-bg py-20">
        <div className="container-custom">
          <div className="glass-card rounded-xl border border-border/30 p-6 md:p-10">
            <div className="mb-12">
              <span className="mono-label mb-3 block">// featured.projects</span>
              <h2 className="section-heading">Featured Projects</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {featuredProjects.map((project) => (
              <div
                key={project.id}
                className="terminal-block group hover-glow"
              >
                {/* Terminal header */}
                <div className="terminal-header">
                  <span className="terminal-dot bg-destructive/80" />
                  <span className="terminal-dot bg-yellow-500/80" />
                  <span className="terminal-dot bg-terminal/80" />
                  <span className="ml-2 truncate text-muted-foreground/60">{project.title}</span>
                </div>

                {/* Project image */}
                <div className="relative aspect-[2/1] w-full overflow-hidden">
                  <Image
                    src={project.coverImage}
                    alt={project.title}
                    width={800}
                    height={400}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    priority={false}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LS0yMi4qLjgyPj4+Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojr/2wBDAR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                </div>

                {/* Project details */}
                <CardContent className="p-5">
                  <h3 className="mb-2 text-lg font-bold tracking-tight">{project.title}</h3>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {project.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="border border-border/30 bg-secondary/50 font-mono text-[10px]"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {project.tags.length > 3 && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        +{project.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {project.liveUrl && (
                      <Button
                        size="sm"
                        asChild
                        className="h-7 font-mono text-[10px]"
                      >
                        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                          Live Demo
                        </a>
                      </Button>
                    )}
                    {project.githubUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-7 border-border/50 font-mono text-[10px]"
                      >
                        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                          Source Code
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
              <Button asChild className="font-mono text-xs">
                <Link href="/projects" className="flex items-center gap-2">
                  View All Projects <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Blog Posts */}
      <section className="relative grid-bg py-20">
        <div className="container-custom">
          <div className="glass-card rounded-xl border border-border/30 p-6 md:p-10">
            <div className="mb-12">
              <span className="mono-label mb-3 block">// recent.posts</span>
              <h2 className="section-heading">Recent Blog Posts</h2>
            </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {recentPosts.map((post) => (
              <Link key={post.id} href={`/blogs/${post.slug}`} className="blog-card group block">
                <div className="relative aspect-video w-full overflow-hidden">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    width={400}
                    height={225}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    priority={false}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LS0yMi4qLjgyPj4+Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojr/2wBDAR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>
                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views || 0}
                    </span>
                  </div>
                  <h3 className="mb-2 text-base font-bold tracking-tight transition-colors group-hover:text-primary">
                    {post.title}
                  </h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="border-border/40 font-mono text-[10px]"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
              <Button asChild className="font-mono text-xs">
                <Link href="/blogs" className="flex items-center gap-2">
                  View All Posts <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="grid-bg py-20">
        <div className="container-custom max-w-4xl">
          <div className="terminal-block">
            <div className="terminal-header">
              <span className="terminal-dot bg-destructive/80" />
              <span className="terminal-dot bg-yellow-500/80" />
              <span className="terminal-dot bg-terminal/80" />
              <span className="ml-2 text-muted-foreground/60">connection_request.sh</span>
            </div>
            <div className="p-8 text-center md:p-12">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Let's Work Together
              </h2>
              <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
                Interested in working together? I'm always open to discussing new projects,
                opportunities, and collaborations.
              </p>
              <Button size="lg" asChild className="font-mono text-xs">
                <a href={`mailto:${profile.socialLinks.email.replace('mailto:', '')}`}>
                  Get In Touch
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
