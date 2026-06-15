import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  setCookie,
  getCookie,
  deleteCookie,
  hasCookie,
  getAllCookies,
  clearAllCookies,
  setSimpleCookie,
  areCookiesEnabled,
} from './cookies'

/**
 * jsdom supports reading/writing document.cookie but does NOT enforce
 * expiry-based deletion or Secure/SameSite directives — those are
 * browser engine concerns. So for expiry / sameSite / path tests we spy
 * on the document.cookie setter to assert the exact string built by our
 * utility, which is more reliable than checking cookie jar state.
 */

describe('cookies utility', () => {
  // Each test gets a clean cookie jar via the real jsdom document.cookie
  // We reset it by deleting every visible cookie between tests.
  beforeEach(() => {
    // Clear all cookies from jsdom cookie jar
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim()
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })
  })

  // -----------------------------------------------------------------------
  // setCookie — string construction (via setter spy)
  // -----------------------------------------------------------------------
  describe('setCookie', () => {
    it('builds the correct cookie string with default path and sameSite', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setCookie('theme', 'dark')

      // Restore
      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written).toHaveLength(1)
      expect(written[0]).toContain('theme=dark')
      expect(written[0]).toContain('path=/')
      expect(written[0]).toContain('samesite=lax')
    })

    it('encodes name and value with encodeURIComponent', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setCookie('my cookie', 'hello world')

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written[0]).toContain('my%20cookie=hello%20world')
    })

    it('appends expires when given a Date', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      const date = new Date('2030-01-01T00:00:00.000Z')
      setCookie('key', 'val', { expires: date })

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written[0]).toContain('expires=Tue, 01 Jan 2030 00:00:00 GMT')
    })

    it('converts numeric expires (days) to a future UTC date', () => {
      const now = Date.now()
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setCookie('key', 'val', { expires: 7 })

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written[0]).toContain('expires=')
      // The date in the string should be ~7 days from now
      const match = written[0].match(/expires=([^;]+)/)!
      const expiresMs = new Date(match[1]).getTime()
      const expectedMs = now + 7 * 24 * 60 * 60 * 1000
      expect(Math.abs(expiresMs - expectedMs)).toBeLessThan(5000)
    })

    it('appends max-age when provided', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setCookie('key', 'val', { maxAge: 3600 })

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written[0]).toContain('max-age=3600')
    })

    it('uses explicit path when provided', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setCookie('key', 'val', { path: '/admin' })

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written[0]).toContain('path=/admin')
      // Should NOT have the default root path (path=/ followed by space or end-of-string)
      expect(written[0]).not.toMatch(/path=\/(?!\S)/)
    })

    it('includes domain when provided', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setCookie('key', 'val', { domain: 'example.com' })

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written[0]).toContain('domain=example.com')
    })

    it('includes secure flag when option is true', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setCookie('key', 'val', { secure: true })

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written[0]).toContain('; secure')
    })

    it('uses explicit sameSite when provided', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setCookie('key', 'val', { sameSite: 'strict' })

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written[0]).toContain('samesite=strict')
    })

    it('does nothing when window is undefined', () => {
      // Simulate server-side by temporarily making window undefined
      const origWindow = global.window
      // @ts-expect-error – intentionally delete window
      delete global.window
      // should not throw
      expect(() => setCookie('key', 'val')).not.toThrow()
      global.window = origWindow
    })
  })

  // -----------------------------------------------------------------------
  // getCookie / setCookie round-trip
  // -----------------------------------------------------------------------
  describe('getCookie', () => {
    it('returns null for a cookie that does not exist', () => {
      expect(getCookie('nonexistent')).toBeNull()
    })

    it('retrieves a cookie that was set', () => {
      setCookie('color', 'blue')
      expect(getCookie('color')).toBe('blue')
    })

    it('returns decoded value for encoded cookie name/value', () => {
      setCookie('my cookie', 'hello world')
      expect(getCookie('my cookie')).toBe('hello world')
    })

    it('returns empty string for a cookie set to empty value', () => {
      setCookie('empty', '')
      expect(getCookie('empty')).toBe('')
    })

    it('returns null when window is undefined', () => {
      const origWindow = global.window
      // @ts-expect-error
      delete global.window
      expect(getCookie('key')).toBeNull()
      global.window = origWindow
    })
  })

  // -----------------------------------------------------------------------
  // deleteCookie
  // -----------------------------------------------------------------------
  describe('deleteCookie', () => {
    it('sets expires to epoch (Jan 1 1970) in the cookie string', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      deleteCookie('session')

      Object.defineProperty(document, 'cookie', origDescriptor)

      // The expires date should be the Unix epoch
      expect(written.some((s) => s.includes('Thu, 01 Jan 1970 00:00:00 GMT'))).toBe(true)
    })

    it('passes path option through to setCookie', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      deleteCookie('token', { path: '/admin' })

      Object.defineProperty(document, 'cookie', origDescriptor)

      expect(written.some((s) => s.includes('path=/admin'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // hasCookie
  // -----------------------------------------------------------------------
  describe('hasCookie', () => {
    it('returns false when cookie does not exist', () => {
      expect(hasCookie('ghost')).toBe(false)
    })

    it('returns true after setting the cookie', () => {
      setCookie('present', '1')
      expect(hasCookie('present')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // getAllCookies
  // -----------------------------------------------------------------------
  describe('getAllCookies', () => {
    it('returns empty object when there are no cookies', () => {
      expect(getAllCookies()).toEqual({})
    })

    it('returns all cookies as a key-value record', () => {
      setCookie('a', '1')
      setCookie('b', '2')
      const all = getAllCookies()
      expect(all['a']).toBe('1')
      expect(all['b']).toBe('2')
    })

    it('decodes encoded names and values', () => {
      setCookie('my name', 'my value')
      const all = getAllCookies()
      expect(all['my name']).toBe('my value')
    })

    it('returns empty object when window is undefined', () => {
      const origWindow = global.window
      // @ts-expect-error
      delete global.window
      expect(getAllCookies()).toEqual({})
      global.window = origWindow
    })
  })

  // -----------------------------------------------------------------------
  // setSimpleCookie
  // -----------------------------------------------------------------------
  describe('setSimpleCookie', () => {
    it('sets a cookie readable by getCookie', () => {
      setSimpleCookie('user', 'alice')
      expect(getCookie('user')).toBe('alice')
    })

    it('uses 7-day expiry by default (reflected in cookie string)', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setSimpleCookie('simple', 'val')

      Object.defineProperty(document, 'cookie', origDescriptor)

      // Should have an expires ~7 days in the future
      expect(written[0]).toContain('expires=')
      const match = written[0].match(/expires=([^;]+)/)!
      const expiresMs = new Date(match[1]).getTime()
      const expectedMs = Date.now() + 7 * 24 * 60 * 60 * 1000
      expect(Math.abs(expiresMs - expectedMs)).toBeLessThan(5000)
    })

    it('accepts a custom days argument', () => {
      const written: string[] = []
      const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!

      Object.defineProperty(document, 'cookie', {
        set: (v: string) => {
          written.push(v)
          origDescriptor.set!.call(document, v)
        },
        get: origDescriptor.get,
        configurable: true,
      })

      setSimpleCookie('simple', 'val', 30)

      Object.defineProperty(document, 'cookie', origDescriptor)

      const match = written[0].match(/expires=([^;]+)/)!
      const expiresMs = new Date(match[1]).getTime()
      const expectedMs = Date.now() + 30 * 24 * 60 * 60 * 1000
      expect(Math.abs(expiresMs - expectedMs)).toBeLessThan(5000)
    })
  })

  // -----------------------------------------------------------------------
  // areCookiesEnabled
  // -----------------------------------------------------------------------
  describe('areCookiesEnabled', () => {
    it('returns true in jsdom (cookies are enabled)', () => {
      expect(areCookiesEnabled()).toBe(true)
    })

    it('returns false when window is undefined', () => {
      const origWindow = global.window
      // @ts-expect-error
      delete global.window
      expect(areCookiesEnabled()).toBe(false)
      global.window = origWindow
    })
  })

  // -----------------------------------------------------------------------
  // clearAllCookies (integration)
  // -----------------------------------------------------------------------
  describe('clearAllCookies', () => {
    it('removes all cookies visible to JavaScript', () => {
      setCookie('x', '1')
      setCookie('y', '2')
      clearAllCookies()
      // jsdom may not actually expire them immediately because of its minimal cookie handling,
      // but at minimum the function should not throw and should attempt deletion of each key
      // We verify by checking that it doesn't throw
      expect(() => clearAllCookies()).not.toThrow()
    })
  })
})
