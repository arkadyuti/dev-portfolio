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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ImageUpload from '@/components/admin/ImageUpload'
import SearchableTagSelect, { Tag } from '@/components/admin/SearchableTagSelect'
import { toast } from '@/components/ui/sonner'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import { IProject } from 'models/project'

// Form schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().min(1, 'Description is required'),
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
  githubUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  status: z.enum(['completed', 'in-progress', 'planned']).default('completed'),
})

type FormValues = z.infer<typeof formSchema>

const AdminProjectForm: React.FC = () => {
  const params = useParams()
  const id = params?.slug as string // For dynamic routes in Next.js
  const router = useRouter()
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Initialize form with default values or existing project data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      featured: false,
      coverImage: '',
      tags: [],
      githubUrl: '',
      liveUrl: '',
      status: 'completed',
    },
  })

  // Load project data if editing
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

        // If editing, fetch project
        if (id && id !== 'new') {
          // Use the slug to fetch the project
          const response = await fetch(`/api/project/${id}`)
          const data = await response.json()

          if (data.success) {
            const project: IProject = data.data
            // Ensure tags have required properties
            const validTags: Tag[] = project.tags.map((tag: { id?: string; name: string }) => ({
              id: tag.id || `tag-${Date.now()}-${Math.random()}`,
              name: tag.name || 'Untitled Tag',
            }))
            form.reset({
              title: project.title,
              slug: project.slug,
              description: project.description,
              featured: project.featured || false,
              coverImage: project.coverImage,
              tags: validTags,
              githubUrl: project.githubUrl || '',
              liveUrl: project.liveUrl || '',
              status: project.status || 'completed',
            })
          } else {
            toast.error('Project not found')
            router.push('/admin/projects')
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

      // Add draft status
      formData.append('isDraft', String(isDraft))

      // Make the API call
      const endpoint = id && id !== 'new' ? `/api/project?projectId=${id}` : '/api/project'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save project')
      }

      const statusMessage = isDraft ? 'saved as draft' : 'published'
      toast.success(
        id && id !== 'new'
          ? `Project updated and ${statusMessage}`
          : `Project created and ${statusMessage}`
      )
      router.push('/admin/projects')
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save project')
    }
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

  return (
    <div>
      <Button variant="ghost" className="mb-6" onClick={() => router.push('/admin/projects')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to projects
      </Button>

      <h1 className="mb-6 text-3xl font-bold">
        {id && id !== 'new' ? 'Edit Project' : 'Create Project'}
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
                          <Input placeholder="Project title" {...field} />
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
                          <Input placeholder="project-slug" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="githubUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/username/repo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="liveUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Live Demo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the project"
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

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-7">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Featured Project</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/projects')}
                  >
                    Cancel
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleSaveAsDraft}>
                    <FileText className="mr-2 h-4 w-4" />
                    Save as Draft
                  </Button>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    {id && id !== 'new' ? 'Update' : 'Publish'} Project
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

export default AdminProjectForm
