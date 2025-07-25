import { ArrowRight } from 'lucide-react'
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

// Explicitly mark page as server component
export const dynamic = 'force-dynamic'

// Generate metadata for homepage
export async function generateMetadata(): Promise<Metadata> {
  return genPageMetadata({
    title: `${profile.name} - ${profile.title}`,
    description: profile.bio,
    keywords: `${profile.name}, Associate Architect, Tekion, AI Developer Workflows, Model Context Protocol, MCP, Enterprise Architecture, CI/CD Optimization, React Expert, TypeScript, Portfolio`,
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
  const personStructuredData = generatePersonStructuredData({
    name: profile.name,
    title: profile.title,
    description: profile.bio,
    image: profile.profileImage,
    url: siteMetadata.siteUrl,
    sameAs: [siteMetadata.github, siteMetadata.linkedin, siteMetadata.x].filter(Boolean),
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
      <section className="py-20 md:py-28">
        <div className="container-custom">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="animate-fade-in lg:col-span-7">
              <h1 className="mb-6 font-heading text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                <span className="text-primary">Arkadyuti Sarkar</span>
              </h1>
              <h2 className="mb-4 text-xl font-medium text-foreground md:text-2xl">
                {profile.title}
              </h2>
              <p className="mb-8 max-w-xl text-xl text-muted-foreground">{profile.bio}</p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link href="/projects">View My Work</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/about">About Me</Link>
                </Button>
              </div>
            </div>
            <div className="animate-slide-up flex justify-center lg:col-span-5 lg:justify-end">
              <div className="relative aspect-square w-full max-w-md">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/0 blur-xl"></div>
                <Image
                  src={profile.profileImage}
                  alt={profile.name}
                  width={400}
                  height={400}
                  className="w-full max-w-md rounded-2xl object-cover shadow-xl"
                  loading="eager"
                  priority={true}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LS0yMi4qLjgyPj4+Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojr/2wBDAR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-secondary/50 py-20">
        <div className="container-custom">
          <h2 className="section-heading mx-auto text-center">My Tech Stack</h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
            These are the technologies I work with on a daily basis to build modern, performant web
            applications.
          </p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {profile.skills
              .flatMap((category) =>
                category.items
                  .slice(0, category.items.length >= 3 ? 3 : category.items.length)
                  .map((skill, idx) => (
                    <Card
                      key={`${category.category}-${idx}`}
                      className="border-none bg-gradient-to-br from-white/90 to-white/50 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md dark:from-secondary/80 dark:to-secondary/50"
                    >
                      <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-semibold text-primary">
                            {skill.charAt(0)}
                          </span>
                        </div>
                        <h3 className="mb-1 text-sm font-medium">{skill}</h3>
                        <p className="text-xs text-muted-foreground">{category.category}</p>
                      </CardContent>
                    </Card>
                  ))
              )
              .slice(0, 15)}
          </div>

          <div className="mt-8 text-center">
            <Button variant="outline" asChild className="group">
              <Link href="/about" className="flex items-center gap-2">
                View All Technologies{' '}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="section-heading">Featured Projects</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {featuredProjects.map((project) => (
              <Card key={project.id} className="flex h-full flex-col overflow-hidden">
                <div className="relative aspect-[2/1] w-full">
                  <Image
                    src={project.coverImage}
                    alt={project.title}
                    width={800}
                    height={400}
                    className="h-full w-full object-cover"
                    priority={false}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LS0yMi4qLjgyPj4+Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojr/2wBDAR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>
                <CardContent className="flex flex-grow flex-col p-6">
                  <h3 className="mb-2 text-xl font-bold">{project.title}</h3>
                  <p className="mb-4 flex-grow text-muted-foreground">{project.description}</p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {project.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                    {project.tags.length > 3 && (
                      <Badge variant="outline">+{project.tags.length - 3}</Badge>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {project.liveUrl && (
                      <Button size="sm" asChild>
                        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                          Live Demo
                        </a>
                      </Button>
                    )}
                    {project.githubUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                          Source Code
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild>
              <Link href="/projects" className="flex items-center gap-2">
                View All Projects <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Recent Blog Posts */}
      <section className="bg-secondary/50 py-20">
        <div className="container-custom">
          <h2 className="section-heading">Recent Blog Posts</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {recentPosts.map((post) => (
              <Link key={post.id} href={`/blogs/${post.slug}`} className="blog-card group block">
                <div className="relative aspect-video w-full overflow-hidden">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    width={400}
                    height={225}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    priority={false}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LS0yMi4qLjgyPj4+Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojo4Ojr/2wBDAR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>
                <div className="p-6">
                  <p className="mb-2 text-sm text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <h3 className="mb-2 text-xl font-bold transition-colors group-hover:text-primary">
                    {post.title}
                  </h3>
                  <p className="line-clamp-2 text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild>
              <Link href="/blogs" className="flex items-center gap-2">
                View All Posts <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20">
        <div className="container-custom max-w-4xl">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-8 text-center md:p-12">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Let's Work Together</h2>
            <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
              Interested in working together? I'm always open to discussing new projects,
              opportunities, and collaborations.
            </p>
            <Button size="lg" asChild>
              <a href={`mailto:${profile.socialLinks.email.replace('mailto:', '')}`}>
                Get In Touch
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
