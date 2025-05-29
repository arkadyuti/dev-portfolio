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
import { IProject } from 'models/project'
import { Tag } from '@/components/admin/SearchableTagSelect'
import logger from '@/lib/logger'

// Define possible project UI status types (different from the model's status)
type ProjectUIStatus = 'published' | 'draft'

// Add status to projects
interface ProjectWithStatus extends Omit<IProject, 'status'> {
  uiStatus: ProjectUIStatus
}

type SortField = 'featured' | 'uiStatus'
type SortOrder = 'asc' | 'desc'

const AdminProjectPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState<ProjectWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('featured')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?fetchAll=true')
      const data = await response.json()

      if (data.success) {
        const projectsWithStatus = data.data.map((project: IProject) => ({
          ...project,
          uiStatus: project.isDraft ? 'draft' : 'published',
        }))
        setProjects(projectsWithStatus)
      } else {
        toast.error('Failed to fetch projects')
      }
    } catch (error) {
      logger.error('Error fetching projects:', error)
      toast.error('Failed to fetch projects')
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

  // Sort and filter projects
  const filteredAndSortedProjects = projects
    .filter(
      (project) =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'featured':
          comparison = (a.featured ? 1 : 0) - (b.featured ? 1 : 0)
          break
        case 'uiStatus':
          comparison = a.uiStatus.localeCompare(b.uiStatus)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Delete function
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/project/${id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          setProjects(projects.filter((project) => project.id !== id))
          toast.success('Project deleted successfully')
        } else {
          toast.error(data.message || 'Failed to delete project')
        }
      } catch (error) {
        logger.error('Error deleting project:', error)
        toast.error('Failed to delete project')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    )
  }

  return (
    <>
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
              <TableHead className="hidden md:table-cell">Tags</TableHead>
              <TableHead
                className="hidden cursor-pointer md:table-cell"
                onClick={() => handleSort('uiStatus')}
              >
                <div className="flex items-center">
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead
                className="hidden cursor-pointer md:table-cell"
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
            {filteredAndSortedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/projects/${project.slug}`}
                      className="hover:underline"
                      target="_blank"
                    >
                      {project.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 2).map((tag: Tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {project.tags.length > 2 && (
                        <span className="inline-flex items-center text-xs text-muted-foreground">
                          +{project.tags.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {project.uiStatus === 'published' ? (
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
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
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
    </>
  )
}

export default AdminProjectPage
