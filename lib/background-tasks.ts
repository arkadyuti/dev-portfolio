import { deleteFile } from './minio'
import { logger } from './logger'

// Queue for background tasks
const backgroundTasks: (() => Promise<void>)[] = []
let isProcessing = false

// Process background tasks
async function processBackgroundTasks() {
  if (isProcessing || backgroundTasks.length === 0) return

  isProcessing = true
  try {
    while (backgroundTasks.length > 0) {
      const task = backgroundTasks.shift()
      if (task) {
        try {
          await task()
        } catch (error) {
          logger.error('Background task failed', error)
          // Continue with next task even if one fails
        }
      }
    }
  } finally {
    isProcessing = false
  }
}

// Add a task to the background queue
export function queueBackgroundTask(task: () => Promise<void>) {
  backgroundTasks.push(task)
  // Start processing if not already running
  if (!isProcessing) {
    processBackgroundTasks()
  }
}

// Queue file deletion task
export function queueFileDeletion(bucketName: string, fileKey: string) {
  queueBackgroundTask(async () => {
    try {
      await deleteFile(bucketName, fileKey)
    } catch (error) {
      console.warn(`Failed to delete file in background: ${fileKey}`, error)
    }
  })
}

// Queue multiple file deletions
export function queueFileDeletions(bucketName: string, fileKeys: string[]) {
  fileKeys.forEach((fileKey) => queueFileDeletion(bucketName, fileKey))
}
