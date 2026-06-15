import { describe, it, expect, vi } from 'vitest'

// Mock mongoose before importing the model
vi.mock('mongoose', () => {
  const Schema: any = function (this: any, definition: any, options: any) {
    this._definition = definition
    this._options = options
    this._hooks = { pre: [] }
    this.pre = function (event: string, fn: Function) {
      this._hooks.pre.push({ event, fn })
    }
    this.set = function () {}
    this.virtual = function () {
      return { get: function () {} }
    }
    this.methods = {}
    this.statics = {}
  }
  Schema.Types = { Mixed: 'Mixed', ObjectId: 'ObjectId' }

  return {
    default: {
      model: vi.fn().mockReturnValue({}),
      models: {},
      Types: { ObjectId: class {} },
    },
    Schema,
    models: {},
    Document: class {},
    Model: class {},
  }
})

import {
  projectSchema,
  transformToType,
  transformToProject,
  transformToProjects,
} from './project'

const validProject = {
  id: 'proj-1',
  title: 'My Portfolio',
  slug: 'my-portfolio',
  description: 'A personal portfolio site',
  coverImage: 'https://example.com/cover.jpg',
  tags: [{ id: 'tag-1', name: 'Next.js' }],
  featured: true,
  status: 'completed' as const,
}

describe('models/project.ts', () => {
  // -----------------------------------------------------------------------
  // projectSchema (Zod)
  // -----------------------------------------------------------------------
  describe('projectSchema', () => {
    it('parses a valid project object', () => {
      const result = projectSchema.parse(validProject)
      expect(result.id).toBe('proj-1')
      expect(result.title).toBe('My Portfolio')
    })

    it('accepts optional githubUrl and liveUrl', () => {
      const result = projectSchema.parse({
        ...validProject,
        githubUrl: 'https://github.com/example/repo',
        liveUrl: 'https://example.com',
      })
      expect(result.githubUrl).toBe('https://github.com/example/repo')
      expect(result.liveUrl).toBe('https://example.com')
    })

    it('allows isDraft to be omitted', () => {
      const result = projectSchema.parse(validProject)
      expect(result.isDraft).toBeUndefined()
    })

    it('accepts isDraft: false', () => {
      const result = projectSchema.parse({ ...validProject, isDraft: false })
      expect(result.isDraft).toBe(false)
    })

    it('allows coverImageKey to be omitted', () => {
      const result = projectSchema.parse(validProject)
      expect(result.coverImageKey).toBeUndefined()
    })

    it('rejects an invalid status value', () => {
      expect(() =>
        projectSchema.parse({ ...validProject, status: 'unknown' })
      ).toThrow()
    })

    it('accepts in-progress status', () => {
      const result = projectSchema.parse({ ...validProject, status: 'in-progress' })
      expect(result.status).toBe('in-progress')
    })

    it('accepts planned status', () => {
      const result = projectSchema.parse({ ...validProject, status: 'planned' })
      expect(result.status).toBe('planned')
    })

    it('throws for missing required field (title)', () => {
      const { title, ...without } = validProject
      expect(() => projectSchema.parse(without)).toThrow()
    })

    it('requires tags to have id and name', () => {
      expect(() =>
        projectSchema.parse({ ...validProject, tags: [{ name: 'React' }] })
      ).toThrow()
    })
  })

  // -----------------------------------------------------------------------
  // transformToType (project.ts version — no error catch, throws on invalid)
  // -----------------------------------------------------------------------
  describe('transformToType', () => {
    it('returns null when doc is null', () => {
      expect(transformToType(null, projectSchema)).toBeNull()
    })

    it('parses a plain object that matches the schema', () => {
      const result = transformToType(validProject, projectSchema)
      expect(result).not.toBeNull()
      expect(result!.slug).toBe('my-portfolio')
    })

    it('calls toObject() when the doc has that method', () => {
      const toObject = vi.fn().mockReturnValue(validProject)
      const doc = { toObject }
      const result = transformToType(doc as any, projectSchema)
      expect(toObject).toHaveBeenCalledOnce()
      expect(result!.id).toBe('proj-1')
    })

    it('returns null for an invalid object (errors swallowed, matching blog.ts)', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(transformToType({ bad: 'data' }, projectSchema)).toBeNull()
      spy.mockRestore()
    })
  })

  // -----------------------------------------------------------------------
  // transformToProject
  // -----------------------------------------------------------------------
  describe('transformToProject', () => {
    it('returns null for null input', () => {
      expect(transformToProject(null)).toBeNull()
    })

    it('returns a valid IProject for a conforming plain object', () => {
      const result = transformToProject(validProject)
      expect(result).not.toBeNull()
      expect(result!.title).toBe('My Portfolio')
    })
  })

  // -----------------------------------------------------------------------
  // transformToProjects
  // -----------------------------------------------------------------------
  describe('transformToProjects', () => {
    it('returns an empty array for empty input', () => {
      expect(transformToProjects([])).toEqual([])
    })

    it('transforms an array of valid docs', () => {
      const docs = [
        validProject,
        { ...validProject, id: 'proj-2', slug: 'second-project', title: 'Second' },
      ]
      const result = transformToProjects(docs as any[])
      expect(result).toHaveLength(2)
      expect(result[1].id).toBe('proj-2')
    })
  })

  // -----------------------------------------------------------------------
  // slug generation logic (same regex rules as blog)
  // -----------------------------------------------------------------------
  describe('slug generation logic', () => {
    function generateBaseSlug(title: string): string {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    it('slugifies a normal title', () => {
      expect(generateBaseSlug('My Awesome Project')).toBe('my-awesome-project')
    })

    it('handles special characters', () => {
      expect(generateBaseSlug('React & TypeScript App')).toBe('react-typescript-app')
    })

    it('trims leading/trailing dashes', () => {
      expect(generateBaseSlug('---project---')).toBe('project')
    })

    it('preserves alphanumeric sequences', () => {
      expect(generateBaseSlug('Project v2.0')).toBe('project-v2-0')
    })
  })
})
