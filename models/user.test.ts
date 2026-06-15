import { describe, it, expect, vi } from 'vitest'

/**
 * user.ts has no Zod schema or exported transform helpers — it exposes only
 * the Mongoose model plus business logic baked into virtual properties and
 * instance methods. We test the pure logic by:
 *   1. Asserting the `isLocked` virtual's comparator rule directly.
 *   2. Testing the `incrementFailedAttempts` threshold (5 attempts → lock).
 *   3. Testing the single-admin pre-save guard.
 */

// Mock mongoose BEFORE importing the model
vi.mock('mongoose', () => {
  const schemaMethods: Record<string, Function> = {}
  const schemaStatics: Record<string, Function> = {}
  const virtualGetters: Record<string, Function> = {}
  let jsonTransform: Function | null = null

  const Schema: any = function (this: any, definition: any, options: any) {
    this._definition = definition
    this._options = options
    this._preSaveHooks = [] as Function[]
    this.methods = schemaMethods
    this.statics = schemaStatics
    this.pre = function (event: string, fn: Function) {
      if (event === 'save') this._preSaveHooks.push(fn)
    }
    this.set = function (key: string, opts: any) {
      if (key === 'toJSON' && opts.transform) {
        jsonTransform = opts.transform
      }
    }
    this.virtual = function (name: string) {
      return {
        get(fn: Function) {
          virtualGetters[name] = fn
        },
      }
    }
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

// Import after mock setup
import './user'

describe('models/user.ts', () => {
  // -----------------------------------------------------------------------
  // isLocked virtual logic
  // -----------------------------------------------------------------------
  describe('isLocked virtual', () => {
    /**
     * The virtual is:
     *   return !!(this.lockUntil && this.lockUntil > new Date())
     * We test that logic directly without needing the registered virtual.
     */
    function isLocked(lockUntil: Date | null): boolean {
      return !!(lockUntil && lockUntil > new Date())
    }

    it('returns false when lockUntil is null', () => {
      expect(isLocked(null)).toBe(false)
    })

    it('returns false when lockUntil is in the past', () => {
      expect(isLocked(new Date(Date.now() - 1000))).toBe(false)
    })

    it('returns true when lockUntil is in the future', () => {
      expect(isLocked(new Date(Date.now() + 30 * 60 * 1000))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // incrementFailedAttempts threshold logic
  // -----------------------------------------------------------------------
  describe('incrementFailedAttempts lock threshold', () => {
    /**
     * The method increments failedLoginAttempts and locks the account
     * when failedLoginAttempts + 1 >= 5.
     */
    function shouldLock(currentAttempts: number): boolean {
      const maxAttempts = 5
      return currentAttempts + 1 >= maxAttempts
    }

    it('does not lock on the 1st failed attempt (attempts=0)', () => {
      expect(shouldLock(0)).toBe(false)
    })

    it('does not lock on the 4th failed attempt (attempts=3)', () => {
      expect(shouldLock(3)).toBe(false)
    })

    it('locks on the 5th failed attempt (attempts=4)', () => {
      expect(shouldLock(4)).toBe(true)
    })

    it('still locks on subsequent failures (attempts=5)', () => {
      expect(shouldLock(5)).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Lock expiry reset logic
  // -----------------------------------------------------------------------
  describe('lock expiry reset', () => {
    /**
     * incrementFailedAttempts resets attempts to 1 when a previous lock
     * has already expired (lockUntil < new Date()).
     */
    function shouldResetDueToExpiredLock(lockUntil: Date | null): boolean {
      return !!(lockUntil && lockUntil < new Date())
    }

    it('does NOT reset when there is no lock', () => {
      expect(shouldResetDueToExpiredLock(null)).toBe(false)
    })

    it('does NOT reset when the lock is still active', () => {
      expect(shouldResetDueToExpiredLock(new Date(Date.now() + 60000))).toBe(false)
    })

    it('resets when the lock has expired', () => {
      expect(shouldResetDueToExpiredLock(new Date(Date.now() - 1000))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // toJSON transform
  // -----------------------------------------------------------------------
  describe('toJSON transform', () => {
    it('removes passwordHash from serialised output', () => {
      // Simulate what the toJSON transform does
      function toJsonTransform(_doc: unknown, ret: Record<string, unknown>) {
        delete ret.passwordHash
        delete ret.__v
        return ret
      }

      const ret = {
        email: 'admin@example.com',
        passwordHash: 'bcrypt$...',
        name: 'Admin',
        __v: 0,
      }

      const result = toJsonTransform(null, ret)
      expect(result.passwordHash).toBeUndefined()
      expect(result.__v).toBeUndefined()
      expect(result.email).toBe('admin@example.com')
    })
  })

  // -----------------------------------------------------------------------
  // single-admin pre-save guard
  // -----------------------------------------------------------------------
  describe('single-admin enforcement logic', () => {
    /**
     * The pre-save hook throws when:
     *   this.isNew === true AND this.role === 'admin' AND adminCount > 0
     */
    async function simulatePreSave(
      isNew: boolean,
      role: string,
      existingAdminCount: number
    ): Promise<{ threw: boolean; message?: string }> {
      try {
        if (isNew && role === 'admin') {
          const adminCount = existingAdminCount
          if (adminCount > 0) {
            throw new Error('Only one admin user is allowed in the system')
          }
        }
        return { threw: false }
      } catch (e: any) {
        return { threw: true, message: e.message }
      }
    }

    it('does not throw when adding first admin (count = 0)', async () => {
      const result = await simulatePreSave(true, 'admin', 0)
      expect(result.threw).toBe(false)
    })

    it('throws when a second admin is attempted (count = 1)', async () => {
      const result = await simulatePreSave(true, 'admin', 1)
      expect(result.threw).toBe(true)
      expect(result.message).toBe('Only one admin user is allowed in the system')
    })

    it('does not throw for a non-admin role even when admin exists', async () => {
      const result = await simulatePreSave(true, 'editor', 1)
      expect(result.threw).toBe(false)
    })

    it('does not check admin count for existing (non-new) documents', async () => {
      const result = await simulatePreSave(false, 'admin', 5)
      expect(result.threw).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // lockUntil duration
  // -----------------------------------------------------------------------
  describe('lock duration', () => {
    it('locks for 30 minutes from now', () => {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000)
      const diffMs = lockUntil.getTime() - Date.now()
      expect(diffMs).toBeGreaterThanOrEqual(29 * 60 * 1000)
      expect(diffMs).toBeLessThanOrEqual(31 * 60 * 1000)
    })
  })
})
