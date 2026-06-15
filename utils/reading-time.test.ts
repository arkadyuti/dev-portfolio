import { describe, it, expect } from 'vitest'
import { calculateReadingTime } from './reading-time'

describe('calculateReadingTime', () => {
  it('returns a minimum of 1 minute for short or empty content', () => {
    expect(calculateReadingTime('')).toBe(1)
    expect(calculateReadingTime('hello world')).toBe(1)
    expect(calculateReadingTime('   ')).toBe(1)
  })

  it('rounds up to the nearest minute at 200 wpm', () => {
    const words = Array.from({ length: 200 }, () => 'word').join(' ')
    expect(calculateReadingTime(words)).toBe(1)

    const words201 = Array.from({ length: 201 }, () => 'word').join(' ')
    expect(calculateReadingTime(words201)).toBe(2)

    const words600 = Array.from({ length: 600 }, () => 'word').join(' ')
    expect(calculateReadingTime(words600)).toBe(3)
  })

  it('strips HTML tags before counting words', () => {
    const html = '<p>one two three</p><div><span>four five</span></div>'
    // 5 words -> 1 minute, but importantly tags are not counted as words
    expect(calculateReadingTime(html)).toBe(1)
  })

  it('does not count HTML tags as words', () => {
    const plain = Array.from({ length: 400 }, () => 'word').join(' ')
    const wrapped = `<article>${plain}</article>`
    expect(calculateReadingTime(wrapped)).toBe(calculateReadingTime(plain))
  })

  it('collapses multiple whitespace characters', () => {
    expect(calculateReadingTime('a\n\n   b\t\tc')).toBe(1)
  })
})
