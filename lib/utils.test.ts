import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('returns an empty string when called with no arguments', () => {
    expect(cn()).toBe('')
  })

  it('returns a single class name unchanged', () => {
    expect(cn('p-4')).toBe('p-4')
  })

  it('merges multiple class names', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center')
  })

  it('deduplicates and overrides conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('overrides conflicting text color utility (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('ignores falsy values: false, null, undefined', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('ignores empty strings', () => {
    expect(cn('', 'a', '', 'b')).toBe('a b')
  })

  it('handles conditional classes via object syntax', () => {
    expect(cn({ 'font-bold': true, italic: false })).toBe('font-bold')
  })

  it('handles array inputs', () => {
    expect(cn(['flex', 'gap-2'])).toBe('flex gap-2')
  })

  it('handles nested arrays', () => {
    expect(cn(['flex', ['gap-2', 'p-4']])).toBe('flex gap-2 p-4')
  })

  it('handles mixed inputs: strings, arrays, objects', () => {
    const result = cn('text-sm', ['font-bold'], { underline: true, 'line-through': false })
    expect(result).toBe('text-sm font-bold underline')
  })

  it('resolves background color conflict correctly', () => {
    expect(cn('bg-red-200', 'bg-blue-200')).toBe('bg-blue-200')
  })
})
