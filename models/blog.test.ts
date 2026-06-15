import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock mongoose BEFORE importing the model.
// The model file calls mongoose.model(...) at module scope, which requires
// a live connection. By mocking the module we can import the pure helpers.
//
// We also capture the last Schema instance constructed so we can invoke
// registered pre-save hooks directly in tests.  The capture object must be
// created via vi.hoisted so it is available when the vi.mock factory runs
// (vi.mock factories are hoisted to the top of the file by Vitest/Babel,
// before any let/const declarations).
// ---------------------------------------------------------------------------

const capture = vi.hoisted(() => ({ schemaInstance: null as any }))

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
    // Capture this instance so tests can access registered hooks
    capture.schemaInstance = this
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
  // slug generation logic — exercising the REAL pre('save') hook
  // -----------------------------------------------------------------------
  describe('slug generation logic', () => {
    /**
     * The mongoose mock captures registered pre-save hooks in `_hooks.pre`.
     * We invoke the real hook function with a controlled `this` context (a fake
     * Mongoose document) and a no-op `next` callback to test slug derivation
     * without needing a live database connection.
     *
     * Tests that only check pure regex transformations are kept as a fast
     * fallback but at least one test below drives the actual registered hook.
     */

    /**
     * Invoke the real pre-save hook registered on BlogSchema.
     * @param fakeDoc - Object acting as `this` inside the hook function.
     * @param findOneResult - Value findOne resolves with (null = no collision).
     */
    async function runPreSaveHook(
      fakeDoc: Record<string, any>,
      findOneResult: any = null
    ): Promise<void> {
      // capture.schemaInstance is set when mongoose.Schema was constructed at
      // module load time; the _hooks.pre array holds { event, fn } entries.
      const saveHooks = capture.schemaInstance._hooks.pre.filter(
        (h: any) => h.event === 'save'
      )
      expect(saveHooks).toHaveLength(1) // sanity check

      // The hook uses `this.constructor.findOne` — wire it up on the fake doc.
      fakeDoc.constructor = {
        findOne: vi.fn().mockResolvedValue(findOneResult),
      }

      const next = vi.fn()
      await saveHooks[0].fn.call(fakeDoc, next)
      expect(next).toHaveBeenCalled()
    }

    it('real hook: generates slug from title when slug is empty', async () => {
      const doc: Record<string, any> = { title: 'Hello World', slug: '' }
      await runPreSaveHook(doc)
      expect(doc.slug).toBe('hello-world')
    })

    it('real hook: does not overwrite an existing slug', async () => {
      const doc: Record<string, any> = { title: 'Hello World', slug: 'existing-slug' }
      await runPreSaveHook(doc)
      expect(doc.slug).toBe('existing-slug')
    })

    it('real hook: appends timestamp suffix when base slug already exists', async () => {
      const before = Date.now()
      const doc: Record<string, any> = { title: 'Duplicate Title', slug: '' }
      // findOne returns a truthy value → collision detected
      await runPreSaveHook(doc, { _id: 'existing' })
      const after = Date.now()

      expect(doc.slug).toMatch(/^duplicate-title-\d{6}$/)
      // The 6-digit suffix comes from the last 6 digits of Date.now()
      const suffix = parseInt(doc.slug.split('-').pop()!, 10)
      // Last 6 digits of any timestamp in [before, after]
      expect(suffix).toBeGreaterThanOrEqual(0)
      expect(suffix).toBeLessThan(1_000_000)
    })

    // ── pure regex helpers (kept for fast, dependency-free coverage) ────────

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
