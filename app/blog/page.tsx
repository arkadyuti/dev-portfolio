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
import Link from '@/components/ui/Link'
import BlogModels, { transformToBlogs } from 'models/blog'

// Server-side data fetching
async function getBlogs(searchParams: { [key: string]: string | string[] | undefined }) {
  const page = parseInt(searchParams.page as string || '1')
  const limit = 6
  const skip = (page - 1) * limit
  const tag = searchParams.tag as string
  const search = searchParams.q as string

  // Build query
  const query: any = { isDraft: false }
  if (tag) {
    query.tags = tag
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { 'tags.name': { $regex: search, $options: 'i' } }
    ]
  }

  // Get total count
  const totalBlogs = await BlogModels.countDocuments(query)

  // Get paginated blogs
  const blogs = await BlogModels.find(query)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  return {
    blogs: transformToBlogs(blogs),
    pagination: {
      total: totalBlogs,
      page,
      limit,
      totalPages: Math.ceil(totalBlogs / limit)
    }
  }
}

// Get all tags for filtering
async function getTags() {
  const blogs = await BlogModels.find({ isDraft: false }).select('tags').lean()
  const tags = new Set()
  blogs.forEach(blog => {
    blog.tags.forEach((tag: any) => tags.add(tag.name))
  })
  return Array.from(tags).map((name, index) => ({ id: String(index + 1), name }))
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const { blogs, pagination } = await getBlogs(searchParams)
  const tags = await getTags()
  const currentPage = parseInt(searchParams.page as string || '1')
  const selectedTagId = searchParams.tag as string
  const searchQuery = searchParams.q as string || ''

  return (
    <section className="py-12 md:py-20">
      <div className="container-custom">
        <h1 className="section-heading mb-12 text-center">Blog Posts</h1>

        {/* Search and filter section */}
        <div className="mb-10 space-y-6">
          <form action="/blog" method="GET" className="flex gap-2">
            <Input
              placeholder="Search posts..."
              name="q"
              defaultValue={searchQuery}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            {searchQuery && (
              <Button variant="ghost" asChild>
                <Link href="/blog">Clear</Link>
              </Button>
            )}
          </form>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagId === tag.name ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-secondary/80"
                asChild
              >
                <Link href={`/blog?tag=${tag.name}`}>
                  {tag.name}
                </Link>
              </Badge>
            ))}
          </div>
        </div>

        {/* Filter info */}
        {(selectedTagId || searchQuery) && (
          <div className="mb-6 rounded-md bg-muted p-3 text-sm">
            <p>
              {pagination.total} post(s) found
              {selectedTagId && ` with tag: ${selectedTagId}`}
              {searchQuery && ` containing: "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Blog posts grid */}
        {blogs.length > 0 ? (
          <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((post) => (
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
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
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
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/blog">Reset filters</Link>
            </Button>
          </div>
        )}

        {/* Pagination */}
        {blogs.length > 0 && pagination.totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink
                    href={`/blog?page=${currentPage - 1}${selectedTagId ? `&tag=${selectedTagId}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}`}
                    className="cursor-pointer"
                  >
                    Previous
                  </PaginationLink>
                </PaginationItem>
              )}

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href={`/blog?page=${page}${selectedTagId ? `&tag=${selectedTagId}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}`}
                    isActive={page === currentPage}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {currentPage < pagination.totalPages && (
                <PaginationItem>
                  <PaginationLink
                    href={`/blog?page=${currentPage + 1}${selectedTagId ? `&tag=${selectedTagId}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}`}
                    className="cursor-pointer"
                  >
                    Next
                  </PaginationLink>
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </section>
  )
}