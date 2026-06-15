/**
 * Tests for lib/background-tasks.ts
 *
 * The module uses module-level mutable state (`backgroundTasks` array,
 * `isProcessing` flag). We reset modules between describe blocks to get
 * a clean slate for each scenario.
 *
 * Covered:
 *  - queueBackgroundTask: pushes tasks and processes them in order
 *  - queueBackgroundTask: continues after a task failure (doesn't stop queue)
 *  - queueBackgroundTask: does not start a second processor while one is running
 *  - queueFileDeletion: calls deleteFile with correct args; swallows errors
 *  - queueFileDeletions: enqueues every key
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock deleteFile (used by queueFileDeletion)
// ---------------------------------------------------------------------------
const mockDeleteFile = vi.fn()

vi.mock('./minio', () => ({
  deleteFile: mockDeleteFile,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Flush all microtasks / resolved promises so queued async tasks actually run
async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

// ---------------------------------------------------------------------------
// queueBackgroundTask
// ---------------------------------------------------------------------------
describe('queueBackgroundTask', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockDeleteFile.mockResolvedValue(undefined)
    // Re-register the mock in the fresh module graph
    vi.mock('./minio', () => ({ deleteFile: mockDeleteFile }))
  })

  it('executes a single queued task', async () => {
    const { queueBackgroundTask } = await import('@/lib/background-tasks')
    const task = vi.fn().mockResolvedValue(undefined)

    queueBackgroundTask(task)
    await flushPromises()

    expect(task).toHaveBeenCalledTimes(1)
  })

  it('executes tasks in FIFO order', async () => {
    const { queueBackgroundTask } = await import('@/lib/background-tasks')
    const order: number[] = []

    queueBackgroundTask(async () => { order.push(1) })
    queueBackgroundTask(async () => { order.push(2) })
    queueBackgroundTask(async () => { order.push(3) })

    await flushPromises()

    expect(order).toEqual([1, 2, 3])
  })

  it('continues processing subsequent tasks after one fails', async () => {
    const { queueBackgroundTask } = await import('@/lib/background-tasks')
    const completed: number[] = []

    queueBackgroundTask(async () => { throw new Error('task 1 failed') })
    queueBackgroundTask(async () => { completed.push(2) })
    queueBackgroundTask(async () => { completed.push(3) })

    await flushPromises()

    expect(completed).toEqual([2, 3])
  })

  it('does not start a new processor while one is already running', async () => {
    const { queueBackgroundTask } = await import('@/lib/background-tasks')
    let resolveFirst!: () => void
    const firstStarted = new Promise<void>((res) => {
      resolveFirst = res
    })

    // First task is long-running; we track how many times the processor fn body runs
    const processorStarts = { count: 0 }

    let firstDone!: () => void
    const firstDonePromise = new Promise<void>((res) => { firstDone = res })

    queueBackgroundTask(async () => {
      processorStarts.count++
      resolveFirst()
      await firstDonePromise
    })

    // Wait for the first task to actually start
    await firstStarted

    // Now add another task — this should NOT start a second concurrent processor
    const secondTask = vi.fn().mockResolvedValue(undefined)
    queueBackgroundTask(secondTask)

    // Second task shouldn't have run yet (first is still blocking)
    expect(secondTask).not.toHaveBeenCalled()

    // Unblock first task
    firstDone()
    await flushPromises()

    // Now the second task should have run, driven by the SAME processor loop
    expect(secondTask).toHaveBeenCalledTimes(1)
    // Only one processor was ever started (count still 1 from the first task)
    expect(processorStarts.count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// queueFileDeletion
// ---------------------------------------------------------------------------
describe('queueFileDeletion', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockDeleteFile.mockResolvedValue(undefined)
    vi.mock('./minio', () => ({ deleteFile: mockDeleteFile }))
  })

  it('calls deleteFile with the correct bucket and key', async () => {
    const { queueFileDeletion } = await import('@/lib/background-tasks')

    queueFileDeletion('portfolio', 'images/old.jpg')
    await flushPromises()

    expect(mockDeleteFile).toHaveBeenCalledWith('portfolio', 'images/old.jpg')
  })

  it('swallows deleteFile errors without propagating', async () => {
    const { queueFileDeletion } = await import('@/lib/background-tasks')
    mockDeleteFile.mockRejectedValue(new Error('delete failed'))

    // Should NOT throw
    queueFileDeletion('portfolio', 'images/ghost.jpg')
    await flushPromises()

    // deleteFile was called and the error was silently caught
    expect(mockDeleteFile).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// queueFileDeletions (plural)
// ---------------------------------------------------------------------------
describe('queueFileDeletions', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockDeleteFile.mockResolvedValue(undefined)
    vi.mock('./minio', () => ({ deleteFile: mockDeleteFile }))
  })

  it('queues deletion for every provided key', async () => {
    const { queueFileDeletions } = await import('@/lib/background-tasks')

    const keys = ['a.jpg', 'b.jpg', 'c.jpg']
    queueFileDeletions('portfolio', keys)
    await flushPromises()

    expect(mockDeleteFile).toHaveBeenCalledTimes(3)
    expect(mockDeleteFile).toHaveBeenCalledWith('portfolio', 'a.jpg')
    expect(mockDeleteFile).toHaveBeenCalledWith('portfolio', 'b.jpg')
    expect(mockDeleteFile).toHaveBeenCalledWith('portfolio', 'c.jpg')
  })

  it('is a no-op for an empty array', async () => {
    const { queueFileDeletions } = await import('@/lib/background-tasks')

    queueFileDeletions('portfolio', [])
    await flushPromises()

    expect(mockDeleteFile).not.toHaveBeenCalled()
  })
})
