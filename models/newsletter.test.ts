import { describe, it, expect, vi } from 'vitest'

// Mock mongoose before importing
vi.mock('mongoose', () => {
  const Schema: any = function (this: any, definition: any, options: any) {
    this._definition = definition
    this._options = options
    this._hooks = { pre: [] }
    this.pre = function (event: string, fn: Function) {
      this._hooks.pre.push({ event, fn })
    }
    this.set = function () {}
    this.virtual = function () { return { get: function () {} } }
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

// Mock uuid (used at module scope)
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mocked-uuid-1234'),
}))

import { newsletterSchema, transformToNewsletter, transformToNewsletters } from './newsletter'

const now = new Date()

const validNewsletter = {
  id: 'news-1',
  email: 'alice@example.com',
}

describe('models/newsletter.ts', () => {
  // -----------------------------------------------------------------------
  // newsletterSchema (Zod)
  // -----------------------------------------------------------------------
  describe('newsletterSchema', () => {
    it('parses a valid newsletter object', () => {
      const result = newsletterSchema.parse(validNewsletter)
      expect(result.id).toBe('news-1')
      expect(result.email).toBe('alice@example.com')
    })

    it('rejects an invalid email', () => {
      expect(() =>
        newsletterSchema.parse({ ...validNewsletter, email: 'not-an-email' })
      ).toThrow()
    })

    it('allows createdAt and updatedAt to be omitted (optional)', () => {
      const result = newsletterSchema.parse(validNewsletter)
      expect(result.createdAt).toBeUndefined()
      expect(result.updatedAt).toBeUndefined()
    })

    it('accepts createdAt and updatedAt as Date objects', () => {
      const result = newsletterSchema.parse({
        ...validNewsletter,
        createdAt: now,
        updatedAt: now,
      })
      expect(result.createdAt).toEqual(now)
    })

    it('throws for missing id', () => {
      const { id, ...without } = validNewsletter
      expect(() => newsletterSchema.parse(without)).toThrow()
    })

    it('throws for missing email', () => {
      const { email, ...without } = validNewsletter
      expect(() => newsletterSchema.parse(without)).toThrow()
    })
  })

  // -----------------------------------------------------------------------
  // transformToNewsletter
  // -----------------------------------------------------------------------
  describe('transformToNewsletter', () => {
    it('returns null for null input', () => {
      expect(transformToNewsletter(null)).toBeNull()
    })

    it('extracts and validates fields from a Mongoose-like document', () => {
      const doc = {
        id: 'news-2',
        email: 'bob@example.com',
        createdAt: now,
        updatedAt: now,
      }
      const result = transformToNewsletter(doc as any)
      expect(result).not.toBeNull()
      expect(result!.email).toBe('bob@example.com')
    })

    it('returns null and logs when email is invalid', () => {
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const doc = {
        id: 'news-bad',
        email: 'BAD_EMAIL',
        createdAt: now,
        updatedAt: now,
      }
      const result = transformToNewsletter(doc as any)
      expect(result).toBeNull()
      expect(logSpy).toHaveBeenCalled()
      logSpy.mockRestore()
    })
  })

  // -----------------------------------------------------------------------
  // transformToNewsletters
  // -----------------------------------------------------------------------
  describe('transformToNewsletters', () => {
    it('returns empty array for empty input', () => {
      expect(transformToNewsletters([])).toEqual([])
    })

    it('transforms multiple valid docs', () => {
      const docs = [
        { id: 'n1', email: 'a@example.com', createdAt: now, updatedAt: now },
        { id: 'n2', email: 'b@example.com', createdAt: now, updatedAt: now },
      ]
      const result = transformToNewsletters(docs as any[])
      expect(result).toHaveLength(2)
      expect(result[0].email).toBe('a@example.com')
    })

    it('filters out invalid docs', () => {
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const docs = [
        { id: 'n1', email: 'good@example.com', createdAt: now, updatedAt: now },
        { id: 'n2', email: 'NOT_AN_EMAIL', createdAt: now, updatedAt: now },
      ]
      const result = transformToNewsletters(docs as any[])
      expect(result).toHaveLength(1)
      expect(result[0].email).toBe('good@example.com')
      logSpy.mockRestore()
    })
  })
})
