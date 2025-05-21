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
import { toast } from '@/components/ui/sonner'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import { IBlog } from 'models/blog'

// Form schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
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
        name: z.string().min(1, 'Tag name is required'),
      })
    )
    .min(1, 'At least one tag is required'),
})

type FormValues = z.infer<typeof formSchema>

// For Next.js App Router, this would be in /admin/blogs/[id]/edit/page.tsx
// or /admin/blogs/new/page.tsx
const AdminBlogForm: React.FC = () => {
  const params = useParams()
  const id = params?.id as string // For dynamic routes in Next.js
  const router = useRouter()
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with default values or existing blog data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
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
    const fetchData = async () => {
      try {
        // Fetch available tags
        const tagsResponse = await fetch('/api/tags')
        const tagsData = await tagsResponse.json()
        if (tagsData.success) {
          // Ensure tags have required properties
          const validTags: Tag[] = tagsData.data.map((tag: { id?: string; name: string }) => ({
            id: tag.id || `tag-${Date.now()}-${Math.random()}`,
            name: tag.name || 'Untitled Tag',
          }))
          setAvailableTags(validTags)
        }

        // If editing, fetch blog post
        if (id && id !== 'new') {
          // Use the ID to fetch the blog post
          const response = await fetch(`/api/blog/${id}`)
          const data = await response.json()

          if (data.success) {
            const post: IBlog = data.data
            // Ensure tags have required properties
            const validTags: Tag[] = post.tags.map((tag: { id?: string; name: string }) => ({
              id: tag.id || `tag-${Date.now()}-${Math.random()}`,
              name: tag.name || 'Untitled Tag',
            }))
            form.reset({
              title: post.title,
              author: post.author,
              date: new Date(post.publishedAt).toISOString().split('T')[0],
              excerpt: post.excerpt,
              content: post.content,
              featured: post.featured || false,
              coverImage: post.coverImage,
              tags: validTags,
            })
          } else {
            toast.error('Blog post not found')
            router.push('/admin/blogs')
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, router, form])

  // Handle tag creation
  const handleCreateTag = (tagName: string) => {
    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random()}`,
      name: tagName,
    }

    setAvailableTags([...availableTags, newTag])

    // Add the newly created tag to the selected tags
    const currentTags = form.getValues('tags')
    form.setValue('tags', [...currentTags, newTag])
  }

  // Handle form submission
  const onSubmit = async (data: FormValues, isDraft: boolean = false) => {
    try {
      setIsSubmitting(true)
      // Create FormData object
      const formData = new FormData()

      // Append all form fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'tags') {
          // Handle tags array - ensure each tag has id and name
          const validTags = (value as Tag[]).map((tag) => ({
            id: tag.id,
            name: tag.name,
          }))
          formData.append('tags', JSON.stringify(validTags))
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

      console.log('finding:: data:', data)

      // Add draft status
      formData.append('isDraft', String(isDraft))

      // Make the API call
      const endpoint = id && id !== 'new' ? `/api/blog?blogId=${id}` : '/api/blog'
      const response = await fetch(endpoint, {
        method: id && id !== 'new' ? 'POST' : 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save blog post')
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
    } finally {
      setIsSubmitting(false)
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

      {isLoading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
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
                          selectedTags={field.value as Tag[]}
                          onChange={(tags: Tag[]) => field.onChange(tags)}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/blogs')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveAsDraft}
                    disabled={isSubmitting}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Save as Draft
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />
                    {id && id !== 'new' ? 'Update' : 'Publish'} Blog Post
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminBlogForm
