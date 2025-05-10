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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import ImageUpload from '@/components/admin/ImageUpload'
import { toast } from '@/components/ui/sonner'
import { ArrowLeft, Plus, X, Save, FileText } from 'lucide-react'
import { projects } from '@/data/project-data'

// Form schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  technologies: z.array(z.string()).min(1, 'At least one technology is required'),
  imageUrl: z.string().min(1, 'Image is required'),
  demoUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  featured: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

// For Next.js App Router, this would be in /admin/projects/[id]/edit/page.tsx
// or /admin/projects/new/page.tsx
const AdminProjectForm: React.FC = () => {
  const params = useParams()
  const id = params?.slug as string // For dynamic routes in Next.js
  const router = useRouter()
  const [newTech, setNewTech] = useState('')

  // Initialize form with default values or existing project data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      technologies: [],
      imageUrl: '',
      demoUrl: '',
      sourceUrl: '',
      featured: false,
    },
  })

  // Load project data if editing
  useEffect(() => {
    if (id && id !== 'new') {
      const project = projects.find((p) => p.id === id)
      if (project) {
        form.reset({
          title: project.title,
          description: project.description,
          technologies: project.technologies,
          imageUrl: project.imageUrl,
          demoUrl: project.demoUrl || '',
          sourceUrl: project.sourceUrl || '',
          featured: project.featured || false,
        })
      } else {
        toast.error('Project not found')
        router.push('/admin/projects')
      }
    }
  }, [id, router, form])

  // Handle form submission
  const onSubmit = async (data: FormValues, isDraft: boolean = false) => {
    try {
      // In a real app, we'd make an API call here
      console.log('Submitting project data:', data, 'isDraft:', isDraft)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const statusMessage = isDraft ? 'saved as draft' : 'published'
      toast.success(
        id && id !== 'new'
          ? `Project updated and ${statusMessage}`
          : `Project created and ${statusMessage}`
      )
      router.push('/admin/projects')
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error('Failed to save project')
    }
  }

  // Handle adding a new technology
  const addTechnology = () => {
    if (!newTech.trim()) return

    const currentTechs = form.getValues('technologies')
    if (!currentTechs.includes(newTech.trim())) {
      form.setValue('technologies', [...currentTechs, newTech.trim()])
    }
    setNewTech('')
  }

  // Handle removing a technology
  const removeTechnology = (tech: string) => {
    const currentTechs = form.getValues('technologies')
    form.setValue(
      'technologies',
      currentTechs.filter((t) => t !== tech)
    )
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

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => onSubmit(data, false))}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Project title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Project description"
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
                name="technologies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technologies</FormLabel>
                    <FormDescription>Add the technologies used in this project</FormDescription>

                    <div className="mb-2 flex gap-2">
                      <Input
                        value={newTech}
                        onChange={(e) => setNewTech(e.target.value)}
                        placeholder="Add technology"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addTechnology()
                          }
                        }}
                      />
                      <Button type="button" onClick={addTechnology} variant="secondary">
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>

                    {field.value.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {field.value.map((tech, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground"
                          >
                            {tech}
                            <button
                              type="button"
                              className="ml-1 text-muted-foreground hover:text-foreground"
                              onClick={() => removeTechnology(tech)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Image</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        label="Upload project image"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="demoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Demo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://demo.example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Link to a live demo of your project (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Code URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://github.com/username/repo" {...field} />
                      </FormControl>
                      <FormDescription>
                        Link to the source code repository (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Featured Project</FormLabel>
                      <FormDescription>
                        Featured projects will be highlighted on the home page
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

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
    </div>
  )
}

export default AdminProjectForm
