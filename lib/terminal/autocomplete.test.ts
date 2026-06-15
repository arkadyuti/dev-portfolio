import { describe, it, expect } from 'vitest'
import { getGhostText, getSuggestions } from './autocomplete'

// ── getGhostText ──────────────────────────────────────────────────────────

describe('getGhostText', () => {
  it('returns null for empty input', () => {
    expect(getGhostText('')).toBeNull()
  })

  it('returns null for whitespace-only input', () => {
    expect(getGhostText('   ')).toBeNull()
  })

  it('returns the suffix for a partial prefix match', () => {
    // "hel" should complete to "help"
    const ghost = getGhostText('hel')
    expect(ghost).toBe('p')
  })

  it('returns the suffix for a full word that has no extension', () => {
    // "help" is exactly a completable string — no ghost (length not > input)
    expect(getGhostText('help')).toBeNull()
  })

  it('completes "who" -> "whoami"', () => {
    const ghost = getGhostText('who')
    expect(ghost).toBe('ami')
  })

  it('completes "cd pro" -> " projects" suffix', () => {
    const ghost = getGhostText('cd pro')
    expect(ghost).toBe('jects')
  })

  it('completes "sudo " prefix', () => {
    // "sudo " should match "sudo hire arka"
    const ghost = getGhostText('sudo ')
    expect(ghost).toBe('hire arka')
  })

  it('is case-insensitive', () => {
    // "HEL" should still complete "help"
    const ghost = getGhostText('HEL')
    // The match is case-insensitive but the ghost preserves original case of completableStrings
    expect(ghost).not.toBeNull()
  })

  it('returns null for input that has no matching prefix', () => {
    expect(getGhostText('zzznomatch')).toBeNull()
  })

  it('returns null when input equals completable string exactly (case-insensitive)', () => {
    // "HELP" lowercase matches "help" exactly, length equal — no ghost
    expect(getGhostText('HELP')).toBeNull()
  })

  it('completes "man --" prefix', () => {
    const ghost = getGhostText('man --')
    // could be "--hire", "--collaborate", or "--chat"; all start with "man --"
    expect(ghost).not.toBeNull()
    // the ghost must complete to one of the known forms
    const full = 'man --' + ghost!
    expect(['man --hire', 'man --collaborate', 'man --chat']).toContain(full)
  })
})

// ── getSuggestions ────────────────────────────────────────────────────────

describe('getSuggestions', () => {
  it('returns empty array for empty input', () => {
    expect(getSuggestions('')).toEqual([])
  })

  it('returns empty array for whitespace-only input', () => {
    expect(getSuggestions('   ')).toEqual([])
  })

  it('returns matching commands for "c" prefix', () => {
    const suggestions = getSuggestions('c')
    // "cat", "cd", "clear", "cowsay" all start with "c"
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.every((s) => s.toLowerCase().startsWith('c'))).toBe(true)
  })

  it('returns specific matches for "cd" prefix', () => {
    const suggestions = getSuggestions('cd')
    expect(suggestions.length).toBeGreaterThan(0)
    // "cd home", "cd projects", etc. should be present
    expect(suggestions.some((s) => s.startsWith('cd '))).toBe(true)
  })

  it('does NOT include exact match (input === suggestion)', () => {
    // "help" is a completable string — getSuggestions should exclude exact matches
    const suggestions = getSuggestions('help')
    expect(suggestions).not.toContain('help')
  })

  it('caps results at 6', () => {
    // "c" matches many strings
    const suggestions = getSuggestions('c')
    expect(suggestions.length).toBeLessThanOrEqual(6)
  })

  it('is case-insensitive', () => {
    const lower = getSuggestions('cd')
    const upper = getSuggestions('CD')
    // Both should return non-empty results (same set)
    expect(upper.length).toBe(lower.length)
  })

  it('returns empty array when no prefix matches', () => {
    expect(getSuggestions('zzznomatch')).toEqual([])
  })

  it('suggests "man --hire" when input is "man --h"', () => {
    const suggestions = getSuggestions('man --h')
    expect(suggestions).toContain('man --hire')
  })

  it('returns multiple man flag suggestions for "man --" prefix', () => {
    const suggestions = getSuggestions('man --')
    // should include --hire, --collaborate, --chat forms
    expect(suggestions.length).toBeGreaterThanOrEqual(3)
  })

  it('returns suggestions for partial "ls" prefix', () => {
    const suggestions = getSuggestions('ls ')
    expect(suggestions.some((s) => s.startsWith('ls '))).toBe(true)
  })
})
