'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Search } from 'lucide-react'
import { getPaginatedBlogPosts, getFilteredBlogPosts, tags, BlogPost } from '@/data/blog-data'
import Link from '@/components/ui/Link'

// Loading component to show while content is loading
function BlogPageLoading() {
  return (
    <section className="py-12 md:py-20">
      <div className="container-custom">
        <div className="mb-12 text-center">
          <div className="mx-auto h-10 w-64 animate-pulse rounded-md bg-muted"></div>
        </div>

        <div className="mb-10 space-y-6">
          <div className="flex gap-2">
            <div className="flex-1 h-10 animate-pulse rounded-md bg-muted"></div>
            <div className="w-24 h-10 animate-pulse rounded-md bg-muted"></div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-muted"></div>
            ))}
          </div>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-md overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted"></div>
              <div className="p-6 space-y-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-6 w-full bg-muted rounded"></div>
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="h-4 w-3/4 bg-muted rounded"></div>
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-16 bg-muted rounded-full"></div>
                  <div className="h-6 w-16 bg-muted rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Main content component that uses useSearchParams
function BlogPageContent() {
  const router = useRouter()
  const { useSearchParams } = require('next/navigation')
  const searchParams = useSearchParams()

  const currentPage = parseInt(searchParams.get('page') || '1')
  const selectedTagId = searchParams.get('tag')
  const searchQuery = searchParams.get('q') || ''
  const postsPerPage = 6

  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([])
  const [displayedPosts, setDisplayedPosts] = useState<BlogPost[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState(searchQuery)

  useEffect(() => {
    // Get posts filtered by tag if specified
    let posts = selectedTagId ? getFilteredBlogPosts(selectedTagId) : getFilteredBlogPosts(null)

    // Apply search filter if present
    if (searchQuery) {
      posts = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.tags.some((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setFilteredPosts(posts)

    // Apply pagination
    setDisplayedPosts(posts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage))
    setTotalPages(Math.ceil(posts.length / postsPerPage))
  }, [selectedTagId, currentPage, searchQuery])

  // Helper function to create URL with new search params
  const createQueryString = (params: Record<string, string | null>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())

    // Process each parameter
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        newSearchParams.delete(key)
      } else {
        newSearchParams.set(key, value)
      }
    })

    return newSearchParams.toString()
  }

  const handleTagClick = (tagId: string) => {
    const params: Record<string, string | null> = { page: '1' }

    if (selectedTagId === tagId) {
      // If the same tag is clicked again, remove the filter
      params.tag = null
    } else {
      params.tag = tagId
    }

    router.push(`?${createQueryString(params)}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params: Record<string, string | null> = { page: '1' }

    if (searchInput.trim()) {
      params.q = searchInput
    } else {
      params.q = null
    }

    router.push(`?${createQueryString(params)}`)
  }

  const clearSearch = () => {
    setSearchInput('')
    router.push(`?${createQueryString({ q: null })}`)
  }

  const handlePageChange = (page: number) => {
    router.push(`?${createQueryString({ page: page.toString() })}`)
  }

  const resetFilters = () => {
    router.push('') // Clear all search params
  }

  return (
    <section className="py-12 md:py-20">
      <div className="container-custom">
        <h1 className="section-heading mb-12 text-center">Blog Posts</h1>

        {/* Search and filter section */}
        <div className="mb-10 space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search posts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            {searchQuery && (
              <Button variant="ghost" onClick={clearSearch}>
                Clear
              </Button>
            )}
          </form>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagId === tag.id ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => handleTagClick(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Filter info */}
        {(selectedTagId || searchQuery) && (
          <div className="mb-6 rounded-md bg-muted p-3 text-sm">
            <p>
              {filteredPosts.length} post(s) found
              {selectedTagId && ` with tag: ${tags.find((t) => t.id === selectedTagId)?.name}`}
              {searchQuery && ` containing: "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Blog posts grid */}
        {displayedPosts.length > 0 ? (
          <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {displayedPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card group block">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <p className="mb-2 text-sm text-muted-foreground">
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <h2 className="mb-2 text-xl font-bold transition-colors group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mb-4 line-clamp-3 text-muted-foreground">{post.excerpt}</p>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-xl text-muted-foreground">No posts found matching your criteria.</p>
            <Button variant="outline" className="mt-4" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {displayedPosts.length > 0 && totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={page === currentPage}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </section>
  )
}

// Main page component with Suspense
const BlogPage = () => {
  return (
    <Suspense fallback={<BlogPageLoading />}>
      <BlogPageContent />
    </Suspense>
  )
}

export default BlogPage