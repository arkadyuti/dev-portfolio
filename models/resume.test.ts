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

// blog.ts must also be importable (resume.ts re-exports transformToType from it)
// The mock above covers mongoose for both

import { resumeSchema, transformToResume } from './resume'

const validResume = {
  id: 'resume-1',
  fileName: 'cv.pdf',
  fileKey: 'resumes/cv.pdf',
  fileUrl: 'https://cdn.example.com/resumes/cv.pdf',
  fileSize: 204800,
  uploadedAt: 1700000000000,
  mimeType: 'application/pdf',
}

describe('models/resume.ts', () => {
  // -----------------------------------------------------------------------
  // resumeSchema (Zod)
  // -----------------------------------------------------------------------
  describe('resumeSchema', () => {
    it('parses a valid resume object', () => {
      const result = resumeSchema.parse(validResume)
      expect(result.id).toBe('resume-1')
      expect(result.fileName).toBe('cv.pdf')
    })

    it('throws for missing required field (fileUrl)', () => {
      const { fileUrl, ...without } = validResume
      expect(() => resumeSchema.parse(without)).toThrow()
    })

    it('throws for wrong type on fileSize (string instead of number)', () => {
      expect(() =>
        resumeSchema.parse({ ...validResume, fileSize: 'big' })
      ).toThrow()
    })

    it('throws for missing uploadedAt', () => {
      const { uploadedAt, ...without } = validResume
      expect(() => resumeSchema.parse(without)).toThrow()
    })

    it('accepts any mimeType string', () => {
      const result = resumeSchema.parse({ ...validResume, mimeType: 'application/msword' })
      expect(result.mimeType).toBe('application/msword')
    })
  })

  // -----------------------------------------------------------------------
  // transformToResume
  // -----------------------------------------------------------------------
  describe('transformToResume', () => {
    it('returns null for null input', () => {
      expect(transformToResume(null)).toBeNull()
    })

    it('returns a valid IResume for a conforming plain object', () => {
      const result = transformToResume(validResume as any)
      expect(result).not.toBeNull()
      expect(result!.fileKey).toBe('resumes/cv.pdf')
    })

    it('calls toObject() when the doc has that method', () => {
      const toObject = vi.fn().mockReturnValue(validResume)
      const doc = { toObject }
      const result = transformToResume(doc as any)
      expect(toObject).toHaveBeenCalledOnce()
      expect(result!.fileName).toBe('cv.pdf')
    })

    it('returns null and logs on invalid doc', () => {
      // transformToResume uses blog.transformToType which catches + logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = transformToResume({ garbage: true } as any)
      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })
  })
})
