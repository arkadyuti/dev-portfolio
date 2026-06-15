import { describe, it, expect, vi } from 'vitest'

// ── Fake mongoose ─────────────────────────────────────────────────────────────

type EventHandler = (...args: unknown[]) => void

function makeFakeMongoose(readyState = 0) {
  const handlers: Record<string, EventHandler[]> = {}
  const connection = {
    readyState,
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    }),
    once: vi.fn((event: string, handler: EventHandler) => {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    }),
    close: vi.fn(async () => {}),
    _emit: (event: string, ...args: unknown[]) => {
      for (const h of handlers[event] ?? []) h(...args)
    },
  }

  const connectMock = vi.fn(async (_uri: string, _opts: unknown) => {
    connection.readyState = 1
    return { connection }
  })

  return {
    default: {
      connect: connectMock,
      connection,
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Reset module registry, set global state, apply env overrides, load the
 * mongodb module, and return a cleanup function that restores everything.
 *
 * NOTE: env overrides stay in place for the whole test body — do NOT pass
 *       the cleanup function into the module load — so that runtime calls
 *       inside connectToDatabase() read the correct values.
 */
async function loadModule(
  mongooseMock: ReturnType<typeof makeFakeMongoose>,
  envOverrides: Record<string, string | undefined> = {}
) {
  vi.resetModules()
  ;(global as Record<string, unknown>).mongoose = undefined
  ;(global as Record<string, unknown>).mongoEventListenersRegistered = undefined

  const saved: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(envOverrides)) {
    saved[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }

  vi.doMock('mongoose', () => mongooseMock)

  const mod = await import('./mongodb')

  const cleanup = () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    vi.resetModules()
    ;(global as Record<string, unknown>).mongoose = undefined
    ;(global as Record<string, unknown>).mongoEventListenersRegistered = undefined
  }

  return { mod, mongoose: mongooseMock.default, cleanup }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('isConnected', () => {
  it('returns false when readyState is 0 (disconnected)', async () => {
    const { mod, cleanup } = await loadModule(makeFakeMongoose(0))
    try { expect(mod.isConnected()).toBe(false) } finally { cleanup() }
  })

  it('returns true when readyState is 1 (connected)', async () => {
    const { mod, cleanup } = await loadModule(makeFakeMongoose(1))
    try { expect(mod.isConnected()).toBe(true) } finally { cleanup() }
  })

  it('returns false when readyState is 2 (connecting)', async () => {
    const { mod, cleanup } = await loadModule(makeFakeMongoose(2))
    try { expect(mod.isConnected()).toBe(false) } finally { cleanup() }
  })
})

describe('getConnectionState', () => {
  it('reflects mongoose.connection.readyState exactly', async () => {
    for (const state of [0, 1, 2, 3]) {
      const { mod, cleanup } = await loadModule(makeFakeMongoose(state))
      try { expect(mod.getConnectionState()).toBe(state) } finally { cleanup() }
    }
  })
})

describe('getCachedConnection', () => {
  it('returns null before any connection is established', async () => {
    const { mod, cleanup } = await loadModule(makeFakeMongoose(0))
    try { expect(mod.getCachedConnection()).toBeNull() } finally { cleanup() }
  })
})

describe('connectToDatabase', () => {
  it('throws during build phase (NEXT_PHASE=phase-production-build)', async () => {
    const { mod, cleanup } = await loadModule(makeFakeMongoose(0), {
      NEXT_PHASE: 'phase-production-build',
    })
    try {
      await expect(mod.default()).rejects.toThrow('Database connection skipped during build phase')
    } finally { cleanup() }
  })

  it('calls mongoose.connect and caches the connection on success', async () => {
    const { mod, mongoose, cleanup } = await loadModule(makeFakeMongoose(0), {
      NEXT_PHASE: undefined,
    })
    try {
      const conn = await mod.default()
      expect(conn).toBeDefined()
      expect(mongoose.connect).toHaveBeenCalledOnce()
      expect(mongoose.connect).toHaveBeenCalledWith(
        process.env.MONGODB_URI,
        expect.objectContaining({ bufferCommands: false })
      )
      expect(mod.getCachedConnection()).not.toBeNull()
    } finally { cleanup() }
  })

  it('reuses the cached connection — connect called only once across two calls', async () => {
    const { mod, mongoose, cleanup } = await loadModule(makeFakeMongoose(0), {
      NEXT_PHASE: undefined,
    })
    try {
      await mod.default()
      await mod.default()
      expect(mongoose.connect).toHaveBeenCalledOnce()
    } finally { cleanup() }
  })

  it('getCachedConnection returns non-null after successful connect', async () => {
    const { mod, cleanup } = await loadModule(makeFakeMongoose(0), {
      NEXT_PHASE: undefined,
    })
    try {
      await mod.default()
      expect(mod.getCachedConnection()).not.toBeNull()
    } finally { cleanup() }
  })

  it('propagates and rethrows connection errors', async () => {
    const fakeMongo = makeFakeMongoose(0)
    fakeMongo.default.connect.mockRejectedValueOnce(new Error('auth failed'))
    const { mod, cleanup } = await loadModule(fakeMongo, { NEXT_PHASE: undefined })
    try {
      await expect(mod.default()).rejects.toThrow('auth failed')
    } finally { cleanup() }
  })
})
