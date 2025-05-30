'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Github } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from '@/components/ui/Link'
import { IBlog } from '@/models/blog'
import { IProject } from '@/models/project'
import { logger } from '@/lib/logger'

type SearchResult = {
  blogs: IBlog[]
  projects: IProject[]
}

interface SearchFormProps {
  initialQuery?: string
  initialResults: SearchResult
}

export default function SearchForm({ initialQuery = '', initialResults }: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult>(initialResults)
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(!!initialQuery)

  // Update search state when URL query param changes
  useEffect(() => {
    const query = searchParams.get('q') || ''
    setSearchQuery(query)
    setHasSearched(!!query)
  }, [searchParams])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    setSearching(true)
    setHasSearched(true)

    // Update URL with search query (without page reload)
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', searchQuery.trim())
    router.push(`/search?${params.toString()}`, { scroll: false })

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)

      if (!response.ok) {
        throw new Error('Search request failed')
      }

      const data = await response.json()

      setResults({
        blogs: data.data.blogs,
        projects: data.data.projects,
      })
    } catch (error) {
      logger.error('Search error', error)
    } finally {
      setSearching(false)
    }
  }

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const totalResults = results.blogs.length + results.projects.length

  return (
    <>
      <form onSubmit={handleSearch} className="mb-12 flex gap-2">
        <Input
          placeholder="Search for blog posts, projects, technologies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 py-6 text-lg"
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
                      <p className="mb-1 text-sm text-muted-foreground">
                        {formatDate(post.publishedAt)}
                      </p>
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
                        {project.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-3">
                        {project.githubUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                              <Github className="mr-2 h-4 w-4" />
                              GitHub
                            </a>
                          </Button>
                        )}
                        {project.liveUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
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
                    <p className="mb-1 text-sm text-muted-foreground">
                      {formatDate(post.publishedAt)}
                    </p>
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
                      {project.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-3">
                      {project.githubUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                            <Github className="mr-2 h-4 w-4" />
                            GitHub
                          </a>
                        </Button>
                      )}
                      {project.liveUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
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
          <Button
            onClick={() => {
              setSearchQuery('')
              router.push('/search', { scroll: false })
            }}
          >
            Clear Search
          </Button>
        </div>
      )}
    </>
  )
}
