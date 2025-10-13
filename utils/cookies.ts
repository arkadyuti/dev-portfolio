/**
 * Cookie utility functions for client-side cookie management
 * Industry standard implementation with proper error handling and type safety
 */

export interface CookieOptions {
  expires?: Date | number // Date object or days from now
  maxAge?: number // seconds
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  httpOnly?: boolean // Note: only works server-side
}

/**
 * Set a cookie with comprehensive options
 * @param name Cookie name
 * @param value Cookie value
 * @param options Cookie configuration options
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof window === 'undefined') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('setCookie called on server-side, skipping')
    }
    return
  }

  try {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

    // Handle expiration
    if (options.expires) {
      let expiresDate: Date
      if (typeof options.expires === 'number') {
        // Treat as days from now
        expiresDate = new Date()
        expiresDate.setTime(expiresDate.getTime() + options.expires * 24 * 60 * 60 * 1000)
      } else {
        expiresDate = options.expires
      }
      cookieString += `; expires=${expiresDate.toUTCString()}`
    }

    // Handle max-age (takes precedence over expires)
    if (options.maxAge !== undefined) {
      cookieString += `; max-age=${options.maxAge}`
    }

    // Handle path
    if (options.path) {
      cookieString += `; path=${options.path}`
    } else {
      cookieString += `; path=/` // Default to root path
    }

    // Handle domain
    if (options.domain) {
      cookieString += `; domain=${options.domain}`
    }

    // Handle secure
    if (options.secure) {
      cookieString += `; secure`
    }

    // Handle sameSite
    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`
    } else {
      cookieString += `; samesite=lax` // Default to lax for security
    }

    document.cookie = cookieString
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to set cookie:', error)
    }
  }
}

/**
 * Get a cookie value by name
 * @param name Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const encodedName = encodeURIComponent(name)
    const cookies = document.cookie.split(';')

    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.split('=').map((c) => c.trim())

      if (cookieName === encodedName) {
        return decodeURIComponent(cookieValue || '')
      }
    }

    return null
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to get cookie:', error)
    }
    return null
  }
}

/**
 * Delete a cookie by setting its expiration to the past
 * @param name Cookie name
 * @param options Cookie options (path and domain should match the original cookie)
 */
export function deleteCookie(
  name: string,
  options: Pick<CookieOptions, 'path' | 'domain'> = {}
): void {
  if (typeof window === 'undefined') {
    return
  }

  setCookie(name, '', {
    ...options,
    expires: new Date(0), // Set to epoch time
  })
}

/**
 * Check if a cookie exists
 * @param name Cookie name
 * @returns True if cookie exists, false otherwise
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null
}

/**
 * Get all cookies as an object
 * @returns Object with cookie names as keys and values as values
 */
export function getAllCookies(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const cookies: Record<string, string> = {}
    const cookieStrings = document.cookie.split(';')

    for (const cookie of cookieStrings) {
      const [name, value] = cookie.split('=').map((c) => c.trim())

      if (name) {
        cookies[decodeURIComponent(name)] = decodeURIComponent(value || '')
      }
    }

    return cookies
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to get all cookies:', error)
    }
    return {}
  }
}

/**
 * Clear all cookies for the current domain
 * Note: This only works for cookies accessible to JavaScript
 */
export function clearAllCookies(): void {
  if (typeof window === 'undefined') {
    return
  }

  const cookies = getAllCookies()

  Object.keys(cookies).forEach((name) => {
    deleteCookie(name)
    // Also try deleting with different path combinations
    deleteCookie(name, { path: '/' })
    deleteCookie(name, { path: '', domain: window.location.hostname })
    deleteCookie(name, { path: '/', domain: window.location.hostname })
  })
}

/**
 * Utility function for setting simple cookies with expiration in days
 * @param name Cookie name
 * @param value Cookie value
 * @param days Number of days until expiration
 */
export function setSimpleCookie(name: string, value: string, days: number = 7): void {
  setCookie(name, value, {
    expires: days,
    path: '/',
    sameSite: 'lax',
  })
}

/**
 * Check if cookies are enabled in the browser
 * @returns True if cookies are enabled, false otherwise
 */
export function areCookiesEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const testCookie = '__cookie_test__'
    setCookie(testCookie, 'test', { maxAge: 1 })
    const enabled = hasCookie(testCookie)
    deleteCookie(testCookie)
    return enabled
  } catch {
    return false
  }
}
