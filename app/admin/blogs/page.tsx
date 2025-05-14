'use client'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash, ArrowUpDown } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import Link from '@/components/ui/Link'
import { IBlog } from 'models/blog'

// Define possible blog status types
type BlogStatus = 'published' | 'draft'

// Add status to blog posts
interface BlogWithStatus extends Omit<IBlog, 'isDraft'> {
  status: BlogStatus
}

type SortField = 'publishedAt' | 'status' | 'featured'
type SortOrder = 'asc' | 'desc'

const AdminBlogPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [blogs, setBlogs] = useState<BlogWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('publishedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      const response = await fetch('/api/blogs?fetchAll=true')
      const data = await response.json()
      
      if (data.success) {
        const blogsWithStatus = data.data.map((blog: IBlog) => ({
          ...blog,
          status: blog.isDraft ? 'draft' : 'published'
        }))
        setBlogs(blogsWithStatus)
      } else {
        toast.error('Failed to fetch blogs')
      }
    } catch (error) {
      console.error('Error fetching blogs:', error)
      toast.error('Failed to fetch blogs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new sort field and default to descending order
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Sort and filter blogs
  const filteredAndSortedBlogs = blogs
    .filter((blog) => blog.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'publishedAt':
          comparison = a.publishedAt - b.publishedAt
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'featured':
          comparison = (a.featured ? 1 : 0) - (b.featured ? 1 : 0)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Delete function
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/blog/${id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          setBlogs(blogs.filter((blog) => blog.id !== id))
          toast.success('Blog post deleted successfully')
        } else {
          toast.error(data.message || 'Failed to delete blog post')
        }
      } catch (error) {
        console.error('Error deleting blog:', error)
        toast.error('Failed to delete blog post')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading blogs...</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Blog Posts</h1>
        <Button asChild>
          <Link href="/admin/blogs/new">
            <Plus className="mr-2" />
            New Blog Post
          </Link>
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
        <Input
          placeholder="Search blog posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Title</TableHead>
              <TableHead 
                className="hidden md:table-cell cursor-pointer"
                onClick={() => handleSort('publishedAt')}
              >
                <div className="flex items-center">
                  Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="hidden md:table-cell cursor-pointer"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="hidden md:table-cell cursor-pointer"
                onClick={() => handleSort('featured')}
              >
                <div className="flex items-center">
                  Featured
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedBlogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No blog posts found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedBlogs.map((blog) => (
                <TableRow key={blog.id}>
                  <TableCell className="font-medium">
                    <Link href={`/blog/${blog.slug}`} className="hover:underline" target="_blank">
                      {blog.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(blog.publishedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {blog.status === 'published' ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                        In Draft
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {blog.featured ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        Featured
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/blogs/edit/${blog.slug}`}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(blog.id)}>
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

export default AdminBlogPage
