/**
 * Calculate the estimated reading time in minutes for a given text.
 * Average reading speed is assumed to be 200 words per minute.
 *
 * @param content The text content to calculate reading time for
 * @returns The estimated reading time in minutes (minimum 1 minute)
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200

  // Remove HTML tags and get plain text for word counting
  const plainText = content.replace(/<[^>]*>/g, ' ')

  // Count words by splitting on whitespace and filtering out empty strings
  const wordCount = plainText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length

  // Calculate reading time and round up to nearest minute
  const readingTime = Math.ceil(wordCount / wordsPerMinute)

  // Return at least 1 minute of reading time
  return Math.max(1, readingTime)
}
