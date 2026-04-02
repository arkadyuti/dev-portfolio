import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { Search, Eye } from 'lucide-react'
import Link from '@/components/ui/Link'
import BlogModels, { transformToBlogs } from 'models/blog'
import Image from 'next/image'
import connectToDatabase from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

async function parseSearchParams(
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
) {
  const params = await searchParams
  return {
    page: params.page ? parseInt(params.page as string) : 1,
    tag: params.tag ? (params.tag as string) : undefined,
    search: params.q ? (params.q as string) : undefined,
  }
}

async function getBlogs(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
  await connectToDatabase()

  const { page, tag, search } = await parseSearchParams(searchParams)
  const limit = 6
  const skip = (page - 1) * limit

  const query: {
    isDraft: boolean
    'tags.name'?: string
    $or?: Array<{
      title?: { $regex: string; $options: string }
      excerpt?: { $regex: string; $options: string }
      'tags.name'?: { $regex: string; $options: string }
    }>
  } = { isDraft: false }
  if (tag) {
    query['tags.name'] = tag
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { 'tags.name': { $regex: search, $options: 'i' } },
    ]
  }

  const totalBlogs = await BlogModels.countDocuments(query)
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
      totalPages: Math.ceil(totalBlogs / limit),
    },
  }
}

async function getTags() {
  const blogs = await BlogModels.find({ isDraft: false }).select('tags').lean()
  const tags = new Set<string>()
  blogs.forEach((blog) => {
    blog.tags.forEach((tag: { id?: string; name: string }) => tags.add(tag.name))
  })
  return Array.from(tags).map((name, index) => ({ id: String(index + 1), name }))
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const {
    page: currentPage,
    tag: selectedTagId,
    search: searchQuery,
  } = await parseSearchParams(searchParams)
  const { blogs, pagination } = await getBlogs(searchParams)
  const tags = await getTags()

  return (
    <section className="relative grid-bg py-12 md:py-20">
      <div className="container-custom">
        <div className="mb-8 font-mono text-xs text-terminal md:text-sm">
          $ ls -la ./posts/
        </div>

        {/* Search & filter — inside a terminal block */}
        <div className="mb-8 terminal-block">
          <div className="terminal-header">
            <span className="terminal-dot bg-destructive/80" />
            <span className="terminal-dot bg-yellow-500/80" />
            <span className="terminal-dot bg-terminal/80" />
            <span className="ml-2 text-muted-foreground/60">grep</span>
          </div>
          <div className="p-4 space-y-4">
            <form action="/blogs" method="GET" className="flex gap-2">
              <Input
                placeholder="grep -i pattern ./posts/*"
                name="q"
                defaultValue={searchQuery}
                className="flex-1 border-border/50 bg-muted/30 font-mono text-xs backdrop-blur-sm"
              />
              <Button type="submit" size="sm" className="font-mono text-[10px]">
                <Search className="mr-1.5 h-3 w-3" />
                grep
              </Button>
              {searchQuery && (
                <Button variant="ghost" size="sm" className="font-mono text-[10px]" asChild>
                  <Link href="/blogs">reset</Link>
                </Button>
              )}
            </form>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="mr-1 font-mono text-[10px] text-muted-foreground/60">tags:</span>
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/blogs${selectedTagId === tag.name ? '' : `?tag=${tag.name}`}${searchQuery ? `&q=${searchQuery}` : ''}`}
                    className="transition-colors"
                  >
                    <Badge
                      variant={selectedTagId === tag.name ? 'default' : 'outline'}
                      className={
                        selectedTagId === tag.name
                          ? 'font-mono text-[10px] hover:bg-primary/90'
                          : 'border-border/40 font-mono text-[10px] hover:bg-primary/10 hover:text-primary'
                      }
                    >
                      {tag.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter info as stdout */}
        {(selectedTagId || searchQuery) && (
          <div className="mb-6 font-mono text-xs text-muted-foreground">
            {pagination.total} result(s)
            {selectedTagId && <> matching tag: <span className="text-primary">{selectedTagId}</span></>}
            {searchQuery && <> containing: <span className="text-primary">"{searchQuery}"</span></>}
          </div>
        )}

        {/* Blog posts */}
        {blogs.length > 0 ? (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/blogs/${post.slug}`}
                  className="terminal-block group hover-glow block"
                >
                  <div className="terminal-header">
                    <span className="terminal-dot bg-destructive/80" />
                    <span className="terminal-dot bg-yellow-500/80" />
                    <span className="terminal-dot bg-terminal/80" />
                    <span className="ml-2 truncate text-muted-foreground/60">
                      {post.slug}.md
                    </span>
                  </div>
                  <div className="aspect-video overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      width={400}
                      height={225}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      priority={index < 3}
                    />
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                      <span>
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.views || 0}
                      </span>
                    </div>
                    <h2 className="mb-2 font-mono text-sm font-bold tracking-tight transition-colors group-hover:text-primary">
                      {post.title}
                    </h2>
                    <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                      {post.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
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

            <div className="font-mono text-xs text-muted-foreground">
              showing {blogs.length} of {pagination.total} post(s)
              {currentPage > 1 && <> · page {currentPage}</>}
            </div>
          </>
        ) : (
          <div className="terminal-block">
            <div className="terminal-header">
              <span className="terminal-dot bg-destructive/80" />
              <span className="terminal-dot bg-yellow-500/80" />
              <span className="terminal-dot bg-terminal/80" />
              <span className="ml-2 text-muted-foreground/60">stdout</span>
            </div>
            <div className="p-6 font-mono text-sm text-muted-foreground">
              <p>0 results matching criteria.</p>
              <Button variant="outline" size="sm" className="mt-4 font-mono text-[10px]" asChild>
                <Link href="/blogs">reset</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {blogs.length > 0 && pagination.totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationLink
                      href={`/blogs?page=${currentPage - 1}${selectedTagId ? `&tag=${selectedTagId}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}`}
                      className="cursor-pointer font-mono text-xs"
                    >
                      prev
                    </PaginationLink>
                  </PaginationItem>
                )}

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href={`/blogs?page=${page}${selectedTagId ? `&tag=${selectedTagId}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}`}
                      isActive={page === currentPage}
                      className="cursor-pointer font-mono text-xs"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {currentPage < pagination.totalPages && (
                  <PaginationItem>
                    <PaginationLink
                      href={`/blogs?page=${currentPage + 1}${selectedTagId ? `&tag=${selectedTagId}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}`}
                      className="cursor-pointer font-mono text-xs"
                    >
                      next
                    </PaginationLink>
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </section>
  )
}
