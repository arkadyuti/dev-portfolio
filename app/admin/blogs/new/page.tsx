'use client'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import ImageUpload from '@/components/admin/ImageUpload'
import SearchableTagSelect, { Tag } from '@/components/admin/SearchableTagSelect'
import { getBlogPostById, getBlogTags } from '@/data/blog-data'
import { toast } from '@/components/ui/sonner'
import { ArrowLeft, Save, FileText } from 'lucide-react'

// Form schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  author: z.string().min(1, 'Author is required'),
  date: z.string().min(1, 'Date is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  content: z.string().min(1, 'Content is required'),
  featured: z.boolean().default(false),
  coverImage: z.union([z.instanceof(File), z.string().min(1, 'Cover image is required')]),
  tags: z
    .array(
      z.object({
        id: z.string().min(1, 'Tag ID is required'),
        name: z.string(),
      })
    )
    .min(1, 'At least one tag is required'),
})

type FormValues = z.infer<typeof formSchema>

// For Next.js App Router, this would be in /admin/blogs/[id]/edit/page.tsx
// or /admin/blogs/new/page.tsx
const AdminBlogForm: React.FC = () => {
  const params = useParams()
  const id = params?.slug as string // For dynamic routes in Next.js
  const router = useRouter()
  const [availableTags, setAvailableTags] = useState<Tag[]>([])

  // Initialize form with default values or existing blog data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      slug: '',
      author: '',
      date: new Date().toISOString().split('T')[0],
      excerpt: '',
      content: '',
      featured: false,
      coverImage: '',
      tags: [],
    },
  })

  // Load blog data if editing
  useEffect(() => {
    // Load available tags
    const tags = getBlogTags()
    setAvailableTags(tags)
    if (id && id !== 'new') {
      const post = getBlogPostById(id)
      if (post) {
        form.reset({
          title: post.title,
          slug: post.slug,
          author: post.author,
          date: new Date(post.date).toISOString().split('T')[0],
          excerpt: post.excerpt,
          content: post.content,
          featured: post.featured || false,
          coverImage: post.coverImage,
          tags: post.tags as Tag[],
        })
      } else {
        toast.error('Blog post not found')
        router.push('/admin/blogs')
      }
    }
  }, [id, router, form])

  // Handle form submission
  const onSubmit = async (data: FormValues, isDraft: boolean = false) => {
    try {
      // Create FormData object
      const formData = new FormData()

      // Append all form fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'tags') {
          // Handle tags array
          formData.append('tags', JSON.stringify(value))
        } else if (key === 'coverImage') {
          // Only append if it's a new File object
          if (value instanceof File) {
            formData.append('coverImage', value)
          }
          // Skip if it's a string (existing image URL)
        } else {
          // Convert all other values to string
          formData.append(key, String(value))
        }
      })

      // Add draft status
      formData.append('isDraft', String(isDraft))

      // Make the API call
      const endpoint = id && id !== 'new' ? `/api/blog?blogId=${id}` : '/api/blog'
      // const endpoint = '/api/blog?blogId='+id
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save blog post')
      }

      const statusMessage = isDraft ? 'saved as draft' : 'published'
      toast.success(
        id && id !== 'new'
          ? `Blog post updated and ${statusMessage}`
          : `Blog post created and ${statusMessage}`
      )
      router.push('/admin/blogs')
    } catch (error) {
      console.error('Error saving blog post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save blog post')
    }
  }

  // Handle tag creation
  const handleCreateTag = (tagName: string) => {
    // In a real app, we'd make an API call to create the tag
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: tagName,
    }

    setAvailableTags([...availableTags, newTag])

    // Add the newly created tag to the selected tags
    const currentTags = form.getValues('tags')
    form.setValue('tags', [...currentTags, newTag])
  }

  // Generate slug from title
  const generateSlug = () => {
    const title = form.getValues('title')
    if (title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace any sequence of non-alphanumeric chars with a single dash
        .replace(/^-|-$/g, '') // Remove leading and trailing dashes
      form.setValue('slug', slug)
    }
  }

  // Handle save as draft
  const handleSaveAsDraft = () => {
    const data = form.getValues()
    onSubmit(data, true)
  }

  // @ts-ignore
  return (
    <div>
      <Button variant="ghost" className="mb-6" onClick={() => router.push('/admin/blogs')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to blog posts
      </Button>

      <h1 className="mb-6 text-3xl font-bold">
        {id && id !== 'new' ? 'Edit Blog Post' : 'Create Blog Post'}
      </h1>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => onSubmit(data, false))}
              className="space-y-6"
              encType="multipart/form-data"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Blog title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Slug
                        <Button
                          type="button"
                          variant="link"
                          className="ml-2 h-auto p-0 text-sm"
                          onClick={generateSlug}
                        >
                          Generate from title
                        </Button>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="blog-post-slug" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input placeholder="Author name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publication Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief summary of the blog post"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Full content of the blog post"
                        className="min-h-[300px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        label="Upload cover image"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <SearchableTagSelect
                        availableTags={availableTags}
                        selectedTags={field.value}
                        onChange={field.onChange}
                        onCreateTag={handleCreateTag}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Featured</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/blogs')}>
                  Cancel
                </Button>
                <Button type="button" variant="secondary" onClick={handleSaveAsDraft}>
                  <FileText className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  {id && id !== 'new' ? 'Update' : 'Publish'} Blog Post
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminBlogForm
