'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { blogPosts, BlogPost } from '@/data/blog-data'
import { projects, Project } from '@/data/project-data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from '@/components/ui/Link'

type SearchResult = {
  blogs: BlogPost[]
  projects: Project[]
}

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ blogs: [], projects: [] })
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    setSearching(true)
    setHasSearched(true)

    // Simulate a search delay for effect
    setTimeout(() => {
      const filteredBlogs = blogPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.tags.some((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      const filteredProjects = projects.filter(
        (project) =>
          project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.technologies.some((tech) =>
            tech.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )

      setResults({
        blogs: filteredBlogs,
        projects: filteredProjects,
      })

      setSearching(false)
    }, 500)
  }

  const totalResults = results.blogs.length + results.projects.length

  return (
    <>
      <section className="py-12 md:py-20">
        <div className="container-custom max-w-4xl">
          <h1 className="section-heading mb-12 text-center">Search</h1>

          <form onSubmit={handleSearch} className="mb-12 flex gap-2">
            <Input
              placeholder="Search for blog posts, projects, technologies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 py-6 text-lg"
              autoFocus
            />
            <Button type="submit" size="lg" disabled={searching}>
              <Search className="mr-2 h-5 w-5" />
              Search
            </Button>
          </form>

          {hasSearched && (
            <div className="mb-8">
              {searching ? (
                <p className="text-center text-muted-foreground">Searching...</p>
              ) : (
                <p className="text-muted-foreground">
                  Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
              )}
            </div>
          )}

          {hasSearched && !searching && totalResults > 0 && (
            <Tabs defaultValue="all">
              <TabsList className="mb-8 grid w-full grid-cols-3">
                <TabsTrigger value="all">All Results ({totalResults})</TabsTrigger>
                <TabsTrigger value="blogs">Blog Posts ({results.blogs.length})</TabsTrigger>
                <TabsTrigger value="projects">Projects ({results.projects.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {results.blogs.length > 0 && (
                  <>
                    <h2 className="mb-4 text-xl font-semibold">Blog Posts</h2>
                    <div className="mb-8 space-y-6">
                      {results.blogs.map((post) => (
                        <Link
                          key={post.id}
                          href={`/blog/${post.slug}`}
                          className="block rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                        >
                          <h3 className="mb-2 text-lg font-semibold">{post.title}</h3>
                          <p className="mb-2 line-clamp-2 text-muted-foreground">{post.excerpt}</p>
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag) => (
                              <Badge key={tag.id} variant="outline">
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                {results.projects.length > 0 && (
                  <>
                    <h2 className="mb-4 text-xl font-semibold">Projects</h2>
                    <div className="space-y-6">
                      {results.projects.map((project) => (
                        <div
                          key={project.id}
                          className="rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                        >
                          <h3 className="mb-2 text-lg font-semibold">{project.title}</h3>
                          <p className="mb-2 text-muted-foreground">{project.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech, idx) => (
                              <Badge key={idx} variant="outline">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-4 flex gap-3">
                            {project.demoUrl && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                                  Live Demo
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="blogs">
                {results.blogs.length > 0 ? (
                  <div className="space-y-6">
                    {results.blogs.map((post) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        className="block rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                      >
                        <h3 className="mb-2 text-lg font-semibold">{post.title}</h3>
                        <p className="mb-2 line-clamp-2 text-muted-foreground">{post.excerpt}</p>
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <Badge key={tag.id} variant="outline">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    No blog posts found for "{searchQuery}"
                  </p>
                )}
              </TabsContent>

              <TabsContent value="projects">
                {results.projects.length > 0 ? (
                  <div className="space-y-6">
                    {results.projects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                      >
                        <h3 className="mb-2 text-lg font-semibold">{project.title}</h3>
                        <p className="mb-2 text-muted-foreground">{project.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {project.technologies.map((tech, idx) => (
                            <Badge key={idx} variant="outline">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-4 flex gap-3">
                          {project.demoUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                                Live Demo
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    No projects found for "{searchQuery}"
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}

          {hasSearched && !searching && totalResults === 0 && (
            <div className="py-12 text-center">
              <h2 className="mb-4 text-2xl font-bold">No results found</h2>
              <p className="mb-6 text-muted-foreground">
                We couldn't find any matches for "{searchQuery}". Please try another search term.
              </p>
              <Button onClick={() => setSearchQuery('')}>Clear Search</Button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default SearchPage
