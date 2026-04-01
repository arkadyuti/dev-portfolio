import { ExternalLink, Github } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import ProjectModels, { transformToProjects } from 'models/project'
import { Tag } from '@/components/admin/SearchableTagSelect'
import connectToDatabase from '@/lib/mongodb'
import { profile } from '@/data/profile-data'
import { ScrollReveal } from '@/components/fx/scroll-reveal'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Server-side data fetching
async function getProjects() {
  // Connect to database first
  await connectToDatabase()

  // Get projects from database (excluding drafts)
  const projects = await ProjectModels.find({ isDraft: false })
    .sort({ featured: -1, createdAt: -1 })
    .lean()

  return transformToProjects(projects)
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <>
      <section className="py-12 md:py-20">
        <div className="container-custom">
          <div className="mb-12 text-center">
            <span className="mono-label mb-3 block">// all.projects</span>
            <h1 className="section-heading mb-12 text-center">My Projects</h1>
          </div>

          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Here are some of the projects I've worked on. Each one represents different challenges
            and learning experiences in my journey as a frontend architect.
          </p>

          {projects.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-mono text-xl text-muted-foreground">No projects found.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {projects.map((project, idx) => (
                <ScrollReveal key={project.id} direction="up" delay={idx * 120}>
                  <div
                    className={`grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12 ${
                      idx % 2 === 1 ? 'md:flex-row-reverse' : ''
                    }`}
                  >
                    <div className={`${idx % 2 === 1 ? 'md:order-2' : ''}`}>
                      <div className="terminal-block hover-glow">
                        <div className="terminal-header">
                          <span className="terminal-dot bg-destructive/80" />
                          <span className="terminal-dot bg-yellow-500/80" />
                          <span className="terminal-dot bg-terminal/80" />
                          <span className="ml-2 text-muted-foreground/60">
                            {project.title.toLowerCase().replace(/\s+/g, '_')}.png
                          </span>
                        </div>
                        <div className="scanline relative overflow-hidden">
                          <Image
                            src={project.coverImage}
                            alt={project.title}
                            width={800}
                            height={450}
                            className="aspect-video h-auto w-full object-cover"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={`${idx % 2 === 1 ? 'md:order-1' : ''}`}>
                      <h2 className="mb-3 text-2xl font-bold md:text-3xl">{project.title}</h2>

                      <p className="mb-6 text-muted-foreground">{project.description}</p>

                      <div className="mb-6 flex flex-wrap gap-2">
                        {project.tags.map((tag: Tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="font-mono text-[10px] border-border/40"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-4">
                        {project.liveUrl && (
                          <Button asChild className="font-mono text-xs">
                            <a
                              href={project.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Live Demo
                            </a>
                          </Button>
                        )}

                        {project.githubUrl && (
                          <Button variant="outline" asChild className="font-mono text-xs">
                            <a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <Github className="h-4 w-4" />
                              Source Code
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact section */}
      <section className="border-t border-border/30 py-12 md:py-20">
        <div className="container-custom max-w-4xl">
          <div className="terminal-block">
            <div className="terminal-header">
              <span className="terminal-dot bg-destructive/80" />
              <span className="terminal-dot bg-yellow-500/80" />
              <span className="terminal-dot bg-terminal/80" />
              <span className="ml-2 text-muted-foreground/60">contact.sh</span>
            </div>
            <div className="p-8 text-center md:p-12">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Interested in working together?</h2>
              <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
                I'm always open to discussing new projects, opportunities, or partnerships.
              </p>
              <Button size="lg" asChild className="font-mono text-xs">
                <a href={profile.socialLinks.email}>Get In Touch</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
