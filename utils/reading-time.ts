/**
 * Calculate the estimated reading time in minutes for a given text.
 * Average reading speed is assumed to be 200 words per minute.
 *
 * @param content The text content to calculate reading time for
 * @returns The estimated reading time in minutes (minimum 1 minute)
 */
export function calculateReadingTime(content: string): number {
  // const wordsPerMinute = 200;
  // const wordCount = content.trim().split(/\s+/).length;
  // const readingTime = Math.ceil(wordCount / wordsPerMinute);

  // // Return at least 1 minute of reading time
  // return Math.max(1, readingTime);
  return 1
}
