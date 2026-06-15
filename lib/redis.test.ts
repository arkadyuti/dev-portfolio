import { describe, it, expect, vi, afterEach } from 'vitest'

// ── Fake Redis class ─────────────────────────────────────────────────────────

type EventHandler = (...args: unknown[]) => void

class FakeRedis {
  static lastInstance: FakeRedis | null = null
  static constructorCalls: Array<unknown[]> = []

  status = 'wait'
  _handlers: Record<string, EventHandler[]> = {}

  constructor(...args: unknown[]) {
    FakeRedis.constructorCalls.push(args)
    FakeRedis.lastInstance = this
  }

  on(event: string, handler: EventHandler) {
    if (!this._handlers[event]) this._handlers[event] = []
    this._handlers[event].push(handler)
    return this
  }

  emit(event: string, ...args: unknown[]) {
    for (const h of this._handlers[event] ?? []) h(...args)
  }

  connect = vi.fn(async () => {
    this.status = 'ready'
  })

  quit = vi.fn(async () => {
    this.status = 'end'
  })

  ping = vi.fn(async () => 'PONG')
}

vi.mock('ioredis', () => ({
  default: FakeRedis,
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Set env vars, reset module registry, and return a fresh module + a cleanup
 * function. The env overrides stay in place for the lifetime of the test so
 * that runtime calls to getRedisClient() see the expected values.
 */
async function freshModule(envOverrides: Record<string, string | undefined> = {}) {
  const saved: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(envOverrides)) {
    saved[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }

  vi.resetModules()
  FakeRedis.lastInstance = null
  FakeRedis.constructorCalls = []

  const mod = await import('./redis')

  const cleanup = async () => {
    // Try to close any open client before restoring env
    try { await mod.closeRedisConnection() } catch { /* ignore */ }
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    vi.resetModules()
    FakeRedis.lastInstance = null
    FakeRedis.constructorCalls = []
  }

  return { mod, cleanup }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getRedisClient', () => {
  it('returns a singleton — same instance on repeated calls', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_URL: undefined, REDIS_PROVIDER: undefined })
    try {
      const a = mod.getRedisClient()
      const b = mod.getRedisClient()
      expect(a).toBe(b)
    } finally { await cleanup() }
  })

  it('constructs Redis with REDIS_URL when set', async () => {
    const { mod, cleanup } = await freshModule({
      REDIS_URL: 'redis://redis-host:6380',
      REDIS_PROVIDER: undefined,
    })
    try {
      mod.getRedisClient()
      // First constructor arg should be the URL string
      expect(FakeRedis.constructorCalls[0][0]).toBe('redis://redis-host:6380')
    } finally { await cleanup() }
  })

  it('constructs Redis with host/port config when REDIS_URL is not set', async () => {
    const { mod, cleanup } = await freshModule({
      REDIS_URL: undefined,
      REDIS_HOST: 'my-redis',
      REDIS_PORT: '6380',
      REDIS_PROVIDER: undefined,
    })
    try {
      mod.getRedisClient()
      const opts = FakeRedis.constructorCalls[0][0] as Record<string, unknown>
      expect(typeof opts).toBe('object')
      expect(opts.host).toBe('my-redis')
      expect(opts.port).toBe(6380)
    } finally { await cleanup() }
  })

  it('throws when REDIS_PROVIDER=upstash', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_PROVIDER: 'upstash' })
    try {
      expect(() => mod.getRedisClient()).toThrow(/Upstash Redis not implemented/)
    } finally { await cleanup() }
  })
})

describe('closeRedisConnection', () => {
  it('calls quit() on the client and resets the singleton', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_URL: undefined, REDIS_PROVIDER: undefined })
    try {
      const client = mod.getRedisClient() as unknown as FakeRedis
      await mod.closeRedisConnection()
      expect(client.quit).toHaveBeenCalledOnce()

      // After close, calling getRedisClient() creates a fresh instance
      const client2 = mod.getRedisClient() as unknown as FakeRedis
      expect(client2).not.toBe(client)
    } finally { await cleanup() }
  })

  it('is a no-op if no client exists', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_URL: undefined, REDIS_PROVIDER: undefined })
    try {
      await expect(mod.closeRedisConnection()).resolves.toBeUndefined()
    } finally { await cleanup() }
  })
})

describe('isRedisHealthy', () => {
  it('returns true when ping returns PONG', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_URL: undefined, REDIS_PROVIDER: undefined })
    try {
      const healthy = await mod.isRedisHealthy()
      expect(healthy).toBe(true)
    } finally { await cleanup() }
  })

  it('returns false when ping throws', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_URL: undefined, REDIS_PROVIDER: undefined })
    try {
      const client = mod.getRedisClient() as unknown as FakeRedis
      client.ping.mockRejectedValueOnce(new Error('connection refused'))
      const healthy = await mod.isRedisHealthy()
      expect(healthy).toBe(false)
    } finally { await cleanup() }
  })

  it('returns false when ping returns something other than PONG', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_URL: undefined, REDIS_PROVIDER: undefined })
    try {
      const client = mod.getRedisClient() as unknown as FakeRedis
      client.ping.mockResolvedValueOnce('NOT_PONG')
      const healthy = await mod.isRedisHealthy()
      expect(healthy).toBe(false)
    } finally { await cleanup() }
  })
})

describe('getConnectedRedisClient', () => {
  it('returns the client after ensuring connection', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_URL: undefined, REDIS_PROVIDER: undefined })
    try {
      const client = await mod.getConnectedRedisClient()
      expect(client).toBeDefined()
      expect(FakeRedis.lastInstance?.connect).toHaveBeenCalled()
    } finally { await cleanup() }
  })

  it('does not call connect() again when status is already ready', async () => {
    const { mod, cleanup } = await freshModule({ REDIS_URL: undefined, REDIS_PROVIDER: undefined })
    try {
      const rawClient = mod.getRedisClient() as unknown as FakeRedis
      rawClient.status = 'ready'
      await mod.getConnectedRedisClient()
      expect(rawClient.connect).not.toHaveBeenCalled()
    } finally { await cleanup() }
  })
})
