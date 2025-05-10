'use client'
import React, { useState } from 'react'
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
import { Plus, Search, Edit, Trash } from 'lucide-react'
import { blogPosts } from '@/data/blog-data'
import { toast } from '@/components/ui/sonner'
import Link from '@/components/ui/Link'

// Define possible blog status types
type BlogStatus = 'published' | 'draft'

// Add status to blog posts
interface BlogWithStatus {
  id: string
  title: string
  slug: string
  date: string
  featured: boolean
  status: BlogStatus
}

const AdminBlogPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize blogs with mock status
  const [blogs, setBlogs] = useState<BlogWithStatus[]>(() =>
    blogPosts.map((blog) => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      date: blog.date,
      featured: blog.featured || false,
      // Randomly assign status for demo purposes
      status: Math.random() > 0.3 ? 'published' : 'draft',
    }))
  )

  // Filter blogs based on search query
  const filteredBlogs = blogs.filter((blog) =>
    blog.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Mock deletion function
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      // In a real app, we'd call an API here
      setBlogs(blogs.filter((blog) => blog.id !== id))
      toast('Blog post deleted successfully')
    }
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
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBlogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No blog posts found
                </TableCell>
              </TableRow>
            ) : (
              filteredBlogs.map((blog) => (
                <TableRow key={blog.id}>
                  <TableCell className="font-medium">
                    <Link href={`/blog/${blog.slug}`} className="hover:underline" target="_blank">
                      {blog.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(blog.date).toLocaleDateString()}
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
                      <Link href={`/admin/blogs/edit/${blog.id}`}>
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
