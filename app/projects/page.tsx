import { ExternalLink, Github } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import ProjectModels, { transformToProjects } from 'models/project'
import { Tag } from '@/components/admin/SearchableTagSelect'
import connectToDatabase from '@/lib/mongodb'
import { profile } from '@/data/profile-data'

export const dynamic = 'force-dynamic'

async function getProjects() {
  await connectToDatabase()
  const projects = await ProjectModels.find({ isDraft: false })
    .sort({ featured: -1, createdAt: -1 })
    .lean()
  return transformToProjects(projects)
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <>
      {/* Projects listing */}
      <section className="relative grid-bg py-12 md:py-20">
        <div className="container-custom max-w-4xl">
          <div className="mb-4 font-mono text-xs text-terminal md:text-sm">
            $ find ./projects --all --format=detail
          </div>
          <p className="mb-10 text-sm text-muted-foreground">
            Here are some of the projects I've worked on. Each one represents different challenges
            and learning experiences in my journey as a frontend architect.
          </p>

          {projects.length === 0 ? (
            <div className="terminal-block">
              <div className="terminal-header">
                <span className="terminal-dot bg-destructive/80" />
                <span className="terminal-dot bg-yellow-500/80" />
                <span className="terminal-dot bg-terminal/80" />
                <span className="ml-2 text-muted-foreground/60">stdout</span>
              </div>
              <div className="p-6 font-mono text-sm text-muted-foreground">
                0 results found.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {projects.map((project, idx) => (
                <div key={project.id} className="terminal-block group hover-glow">
                  <div className="terminal-header">
                    <span className="terminal-dot bg-destructive/80" />
                    <span className="terminal-dot bg-yellow-500/80" />
                    <span className="terminal-dot bg-terminal/80" />
                    <span className="ml-2 truncate text-muted-foreground/60">
                      [{String(idx + 1).padStart(2, '0')}]{' '}
                      {project.title.toLowerCase().replace(/\s+/g, '_')}
                    </span>
                  </div>

                  {/* Project image */}
                  <div className="scanline relative overflow-hidden">
                    <Image
                      src={project.coverImage}
                      alt={project.title}
                      width={800}
                      height={450}
                      className="aspect-video h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  </div>

                  {/* Project details */}
                  <div className="p-4 md:p-6">
                    <h2 className="mb-2 font-mono text-base font-bold md:text-lg">
                      {project.title}
                    </h2>
                    <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                      {project.description}
                    </p>

                    <div className="mb-5 flex flex-wrap gap-1.5">
                      {project.tags.map((tag: Tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="border-border/40 font-mono text-[10px]"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {project.liveUrl && (
                        <Button size="sm" asChild className="h-7 font-mono text-[10px]">
                          <a
                            href={project.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            open --demo
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
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5"
                          >
                            <Github className="h-3 w-3" />
                            open --source
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2 font-mono text-xs text-muted-foreground">
                {projects.length} project(s) found.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="relative grid-bg py-12 md:py-20">
        <div className="container-custom max-w-4xl">
          <div className="terminal-block">
            <div className="terminal-header">
              <span className="terminal-dot bg-destructive/80" />
              <span className="terminal-dot bg-yellow-500/80" />
              <span className="terminal-dot bg-terminal/80" />
              <span className="ml-2 text-muted-foreground/60">./connect.sh</span>
            </div>
            <div className="p-6 md:p-10">
              <div className="mb-6 font-mono text-xs text-terminal md:text-sm">
                $ ./connect.sh
              </div>
              <h2 className="mb-4 font-mono text-2xl font-bold md:text-3xl">
                Interested in working together?
              </h2>
              <p className="mb-8 text-sm text-muted-foreground">
                I'm always open to discussing new projects, opportunities, or partnerships.
              </p>
              <Button size="lg" asChild className="font-mono text-xs">
                <a href={profile.socialLinks.email}>open mailto:</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
