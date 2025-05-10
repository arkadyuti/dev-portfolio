import { ExternalLink, Github } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { projects } from '@/data/project-data'

const ProjectsPage = () => {
  return (
    <>
      <section className="py-12 md:py-20">
        <div className="container-custom">
          <h1 className="section-heading mb-12 text-center">My Projects</h1>

          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Here are some of the projects I've worked on. Each one represents different challenges
            and learning experiences in my journey as a frontend architect.
          </p>

          <div className="space-y-16">
            {projects.map((project, idx) => (
              <div
                key={project.id}
                className={`grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12 ${
                  idx % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                <div className={`${idx % 2 === 1 ? 'md:order-2' : ''}`}>
                  <div className="group relative">
                    <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary to-purple-600 opacity-30 blur transition duration-1000 group-hover:opacity-70"></div>
                    <div className="relative overflow-hidden rounded-lg border bg-card">
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="aspect-video h-auto w-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className={`${idx % 2 === 1 ? 'md:order-1' : ''}`}>
                  <h2 className="mb-3 text-2xl font-bold md:text-3xl">{project.title}</h2>

                  <p className="mb-6 text-muted-foreground">{project.description}</p>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {project.technologies.map((tech, techIdx) => (
                      <Badge key={techIdx} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {project.demoUrl && (
                      <Button asChild>
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Live Demo
                        </a>
                      </Button>
                    )}

                    {project.sourceUrl && (
                      <Button variant="outline" asChild>
                        <a
                          href={project.sourceUrl}
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
            ))}
          </div>
        </div>
      </section>

      {/* Contact section */}
      <section className="bg-secondary/50 py-12 md:py-20">
        <div className="container-custom max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Interested in working together?</h2>
          <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
            I'm always open to discussing new projects, opportunities, or partnerships.
          </p>
          <Button size="lg" asChild>
            <a href="mailto:john@example.com">Get In Touch</a>
          </Button>
        </div>
      </section>
    </>
  )
}

export default ProjectsPage
