import { completableStrings } from './commands'

export function getGhostText(input: string): string | null {
  if (!input.trim()) return null

  const lower = input.toLowerCase()

  // Check completable strings (includes commands with common args)
  for (const str of completableStrings) {
    if (str.toLowerCase().startsWith(lower) && str.length > input.length) {
      return str.slice(input.length)
    }
  }

  return null
}

export function getSuggestions(input: string): string[] {
  if (!input.trim()) return []

  const lower = input.toLowerCase()

  return completableStrings
    .filter((str) => str.toLowerCase().startsWith(lower) && str.toLowerCase() !== lower)
    .slice(0, 6)
}
