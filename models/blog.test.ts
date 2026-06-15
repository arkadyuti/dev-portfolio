import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock mongoose BEFORE importing the model.
// The model file calls mongoose.model(...) at module scope, which requires
// a live connection. By mocking the module we can import the pure helpers.
// ---------------------------------------------------------------------------
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
    this.index = function () {}
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

import { blogSchema, transformToType, transformToBlog, transformToBlogs } from './blog'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// A minimal valid blog object that satisfies blogSchema
// ---------------------------------------------------------------------------
const validBlog = {
  id: 'blog-1',
  publishedAt: 1700000000000,
  title: 'Hello World',
  excerpt: 'A short excerpt',
  coverImage: 'https://example.com/img.jpg',
  author: 'Alice',
  slug: 'hello-world',
  content: '<p>Content here</p>',
  contentRTE: { type: 'doc', content: [] },
  tags: [{ id: 'tag-1', name: 'TypeScript' }],
  featured: false,
}

describe('models/blog.ts', () => {
  // -----------------------------------------------------------------------
  // blogSchema (Zod)
  // -----------------------------------------------------------------------
  describe('blogSchema', () => {
    it('parses a valid blog object', () => {
      const result = blogSchema.parse(validBlog)
      expect(result.title).toBe('Hello World')
      expect(result.slug).toBe('hello-world')
    })

    it('defaults views to 0 when not provided', () => {
      const result = blogSchema.parse(validBlog)
      expect(result.views).toBe(0)
    })

    it('accepts an explicit views value', () => {
      const result = blogSchema.parse({ ...validBlog, views: 42 })
      expect(result.views).toBe(42)
    })

    it('allows isDraft to be omitted (optional)', () => {
      const result = blogSchema.parse(validBlog)
      expect(result.isDraft).toBeUndefined()
    })

    it('accepts isDraft: true', () => {
      const result = blogSchema.parse({ ...validBlog, isDraft: true })
      expect(result.isDraft).toBe(true)
    })

    it('allows coverImageKey to be omitted', () => {
      const result = blogSchema.parse(validBlog)
      expect(result.coverImageKey).toBeUndefined()
    })

    it('accepts contentImages array', () => {
      const result = blogSchema.parse({
        ...validBlog,
        contentImages: ['https://example.com/1.jpg'],
      })
      expect(result.contentImages).toEqual(['https://example.com/1.jpg'])
    })

    it('throws ZodError for a missing required field (title)', () => {
      const { title, ...without } = validBlog
      expect(() => blogSchema.parse(without)).toThrow()
    })

    it('accepts tags with optional id omitted', () => {
      const result = blogSchema.parse({
        ...validBlog,
        tags: [{ name: 'JavaScript' }],
      })
      expect(result.tags[0].name).toBe('JavaScript')
    })
  })

  // -----------------------------------------------------------------------
  // transformToType
  // -----------------------------------------------------------------------
  describe('transformToType', () => {
    it('returns null when doc is null', () => {
      expect(transformToType(null, blogSchema)).toBeNull()
    })

    it('parses a plain object that matches the schema', () => {
      const result = transformToType(validBlog, blogSchema)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('blog-1')
    })

    it('returns null and logs on invalid input', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = transformToType({ not: 'a blog' }, blogSchema)
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Schema validation error:', expect.anything())
      consoleSpy.mockRestore()
    })

    it('calls toObject() when the doc has that method', () => {
      const toObject = vi.fn().mockReturnValue(validBlog)
      const mongooseDoc = { toObject }
      const result = transformToType(mongooseDoc as any, blogSchema)
      expect(toObject).toHaveBeenCalledOnce()
      expect(result).not.toBeNull()
      expect(result!.title).toBe('Hello World')
    })

    it('works with a custom Zod schema', () => {
      const simpleSchema = z.object({ name: z.string() })
      const result = transformToType({ name: 'test' }, simpleSchema)
      expect(result).toEqual({ name: 'test' })
    })
  })

  // -----------------------------------------------------------------------
  // transformToBlog
  // -----------------------------------------------------------------------
  describe('transformToBlog', () => {
    it('returns null for null input', () => {
      expect(transformToBlog(null)).toBeNull()
    })

    it('returns a valid IBlog for a conforming plain object', () => {
      const result = transformToBlog(validBlog)
      expect(result).not.toBeNull()
      expect(result!.slug).toBe('hello-world')
    })

    it('returns null for an invalid object', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(transformToBlog({ garbage: true } as any)).toBeNull()
      consoleSpy.mockRestore()
    })
  })

  // -----------------------------------------------------------------------
  // transformToBlogs
  // -----------------------------------------------------------------------
  describe('transformToBlogs', () => {
    it('returns an empty array for an empty input', () => {
      expect(transformToBlogs([])).toEqual([])
    })

    it('transforms an array of valid docs', () => {
      const result = transformToBlogs([validBlog, { ...validBlog, id: 'blog-2', slug: 'second' }])
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('blog-1')
      expect(result[1].id).toBe('blog-2')
    })

    it('filters out invalid docs (null returns from transformToType)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = transformToBlogs([validBlog, { bad: 'doc' } as any])
      expect(result).toHaveLength(1)
      consoleSpy.mockRestore()
    })
  })

  // -----------------------------------------------------------------------
  // slug generation logic (extracted from pre-save hook)
  // -----------------------------------------------------------------------
  describe('slug generation logic', () => {
    /**
     * The actual hook runs against a Mongoose document. We test the slug
     * transformation rules by applying the same regex operations directly.
     */
    function generateBaseSlug(title: string): string {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    it('converts title to lowercase', () => {
      expect(generateBaseSlug('Hello World')).toBe('hello-world')
    })

    it('replaces non-alphanumeric sequences with a single dash', () => {
      expect(generateBaseSlug('Hello, World!')).toBe('hello-world')
    })

    it('trims leading and trailing dashes', () => {
      expect(generateBaseSlug('!Hello!')).toBe('hello')
    })

    it('collapses multiple separators into one dash', () => {
      expect(generateBaseSlug('a   ---   b')).toBe('a-b')
    })

    it('preserves numbers', () => {
      expect(generateBaseSlug('Top 10 Tips')).toBe('top-10-tips')
    })

    it('handles already-slug-like titles', () => {
      expect(generateBaseSlug('my-great-post')).toBe('my-great-post')
    })

    it('handles titles with special characters', () => {
      expect(generateBaseSlug("What's New in TypeScript 5.0?")).toBe(
        'what-s-new-in-typescript-5-0'
      )
    })
  })
})
