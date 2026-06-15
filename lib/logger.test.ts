import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// logger reads LOG_LEVEL at import time; we want the default (debug in test env)
// so we import it once at the top and share across all tests.
import { logger } from './logger'

// Regex that matches the log format: [<iso>] [LEVEL] message
const ISO_REGEX = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/

describe('logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── format ──────────────────────────────────────────────────────────────────

  it('formats debug messages as [<iso>] [DEBUG] message', () => {
    logger.debug('hello debug')
    const msg = consoleSpy.log.mock.calls[0][0] as string
    expect(msg).toMatch(ISO_REGEX)
    expect(msg).toContain('[DEBUG] hello debug')
  })

  it('formats info messages as [<iso>] [INFO] message', () => {
    logger.info('hello info')
    const msg = consoleSpy.log.mock.calls[0][0] as string
    expect(msg).toMatch(ISO_REGEX)
    expect(msg).toContain('[INFO] hello info')
  })

  it('formats warn messages as [<iso>] [WARN] message', () => {
    logger.warn('hello warn')
    const msg = consoleSpy.warn.mock.calls[0][0] as string
    expect(msg).toMatch(ISO_REGEX)
    expect(msg).toContain('[WARN] hello warn')
  })

  it('formats error messages as [<iso>] [ERROR] message', () => {
    logger.error('hello error')
    const msg = consoleSpy.error.mock.calls[0][0] as string
    expect(msg).toMatch(ISO_REGEX)
    expect(msg).toContain('[ERROR] hello error')
  })

  // ── console routing ──────────────────────────────────────────────────────────

  it('debug and info use console.log', () => {
    logger.debug('d')
    logger.info('i')
    expect(consoleSpy.log).toHaveBeenCalledTimes(2)
    expect(consoleSpy.warn).not.toHaveBeenCalled()
    expect(consoleSpy.error).not.toHaveBeenCalled()
  })

  it('warn uses console.warn', () => {
    logger.warn('w')
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
    expect(consoleSpy.log).not.toHaveBeenCalled()
  })

  it('error uses console.error', () => {
    logger.error('e')
    expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    expect(consoleSpy.log).not.toHaveBeenCalled()
  })

  // ── meta serialization ───────────────────────────────────────────────────────

  it('appends JSON-stringified object meta after " - "', () => {
    logger.info('with meta', { key: 'value', num: 42 })
    const msg = consoleSpy.log.mock.calls[0][0] as string
    expect(msg).toContain(' - {"key":"value","num":42}')
  })

  it('appends string meta directly', () => {
    logger.info('with string meta', 'extra-info')
    const msg = consoleSpy.log.mock.calls[0][0] as string
    expect(msg).toContain(' - extra-info')
  })

  it('appends numeric meta directly', () => {
    logger.debug('with number meta', 123)
    const msg = consoleSpy.log.mock.calls[0][0] as string
    expect(msg).toContain(' - 123')
  })

  it('omits meta section when no meta is provided', () => {
    logger.info('no meta')
    const msg = consoleSpy.log.mock.calls[0][0] as string
    expect(msg).not.toContain(' - ')
  })

  it('handles circular references gracefully without throwing', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => logger.info('circular', circular)).not.toThrow()
    const msg = consoleSpy.log.mock.calls[0][0] as string
    expect(msg).toContain('[Error serializing metadata]')
  })

  // ── level filtering ──────────────────────────────────────────────────────────
  // In test env LOG_LEVEL defaults to 'debug' (NODE_ENV !== 'production'),
  // so all levels should pass through.

  it('logs all levels when LOG_LEVEL is debug (default in test)', () => {
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(consoleSpy.log).toHaveBeenCalledTimes(2)   // debug + info
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
    expect(consoleSpy.error).toHaveBeenCalledTimes(1)
  })
})
