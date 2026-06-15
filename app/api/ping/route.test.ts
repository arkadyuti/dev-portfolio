import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('GET /api/ping', () => {
  it('returns 200 with pong message', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.message).toBe('pong')
  })

  it('includes a version field', async () => {
    const res = await GET()
    const json = await res.json()
    expect(typeof json.version).toBe('string')
    expect(json.version.length).toBeGreaterThan(0)
  })

  it('includes a timestamp in ISO format', async () => {
    const before = Date.now()
    const res = await GET()
    const after = Date.now()
    const json = await res.json()
    const ts = new Date(json.timestamp).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})
