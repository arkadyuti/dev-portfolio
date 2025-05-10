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
import { projects } from '@/data/project-data'
import { toast } from '@/components/ui/sonner'
import Link from '@/components/ui/Link'

// Define possible project status types
type ProjectStatus = 'published' | 'draft'

// Add status to projects
interface ProjectWithStatus {
  id: string
  title: string
  description: string
  technologies: string[]
  imageUrl: string
  demoUrl?: string
  sourceUrl?: string
  featured?: boolean
  status: ProjectStatus
}

const AdminProjectPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize projects with mock status
  const [projectsList, setProjectsList] = useState<ProjectWithStatus[]>(() =>
    projects.map((project) => ({
      ...project,
      // Randomly assign status for demo purposes
      status: Math.random() > 0.3 ? 'published' : 'draft',
    }))
  )

  // Filter projects based on search query
  const filteredProjects = projectsList.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Mock deletion function
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      // In a real app, we'd call an API here
      setProjectsList(projectsList.filter((project) => project.id !== id))
      toast('Project deleted successfully')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
        <Input
          placeholder="Search projects..."
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
              <TableHead className="hidden md:table-cell">Technologies</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.slice(0, 2).map((tech, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.technologies.length > 2 && (
                        <span className="inline-flex items-center text-xs text-muted-foreground">
                          +{project.technologies.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {project.status === 'published' ? (
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
                    {project.featured ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                        Featured
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/projects/edit/${project.id}`}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(project.id)}>
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
    </div>
  )
}

export default AdminProjectPage
