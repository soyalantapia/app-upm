import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

// Carga .env del server (DATABASE_URL de Railway) sin dependencia dotenv.
const HERE = path.dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(path.resolve(HERE, '../../.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}
delete process.env.ANTHROPIC_API_KEY // forzar la rama 503 del asistente

const { loadConfig } = await import('../../src/config.js')
const { createDb } = await import('../../src/db/client.js')
const { buildApp } = await import('../../src/app.js')

let app: FastifyInstance
let pool: { end: () => Promise<void> }

beforeAll(async () => {
  const config = loadConfig()
  const created = createDb(config.DATABASE_URL)
  pool = created.pool
  app = await buildApp(config, created.db)
})

afterAll(async () => {
  await app.close()
  await pool.end()
})

describe('GET /feed', () => {
  it('shape exacto { items, fetchedAt, sources } con NewsItem válidos', async () => {
    const res = await app.inject({ method: 'GET', url: '/feed' })
    expect(res.statusCode).toBe(200)
    const j = res.json()
    expect(Object.keys(j).sort()).toEqual(['fetchedAt', 'items', 'sources'])
    expect(j.items.length).toBeGreaterThan(50)
    expect(typeof j.fetchedAt).toBe('string')
    expect(Number.isNaN(Date.parse(j.fetchedAt))).toBe(false)
    const item = j.items[0]
    for (const k of ['id', 'title', 'country', 'topic', 'type', 'date', 'relevance', 'excerpt', 'source']) {
      expect(item).toHaveProperty(k)
    }
    // ningún campo null (opcionales se omiten)
    for (const it2 of j.items) {
      for (const [k, v] of Object.entries(it2)) expect(v, `${it2.id}.${k} no debe ser null`).not.toBeNull()
    }
    const src = j.sources[0]
    for (const k of ['id', 'label', 'country', 'ok', 'count']) expect(src).toHaveProperty(k)
  })

  it('filtro ?pais=BR devuelve solo BR', async () => {
    const res = await app.inject({ method: 'GET', url: '/feed?pais=BR' })
    const j = res.json()
    expect(new Set(j.items.map((i: { country: string }) => i.country))).toEqual(new Set(['BR']))
  })

  it('filtro ?tema=ambiente devuelve solo ambiente', async () => {
    const res = await app.inject({ method: 'GET', url: '/feed?tema=ambiente' })
    const j = res.json()
    expect(new Set(j.items.map((i: { topic: string }) => i.topic))).toEqual(new Set(['ambiente']))
  })

  it('400 con valor fuera de enum', async () => {
    const res = await app.inject({ method: 'GET', url: '/feed?pais=XX' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('invalid query')
  })
})

describe('GET /laws y /search', () => {
  it('/laws solo tipos ley/decreto/reglamento/informe', async () => {
    const res = await app.inject({ method: 'GET', url: '/laws' })
    const types = new Set(res.json().items.map((i: { type: string }) => i.type))
    for (const t of types) expect(['ley', 'decreto', 'reglamento', 'informe']).toContain(t)
  })

  it('/search requiere q >= 2 chars', async () => {
    expect((await app.inject({ method: 'GET', url: '/search' })).statusCode).toBe(400)
    expect((await app.inject({ method: 'GET', url: '/search?q=a' })).statusCode).toBe(400)
    const ok = await app.inject({ method: 'GET', url: '/search?q=glaciares' })
    expect(ok.statusCode).toBe(200)
    expect(ok.json().items.length).toBeGreaterThan(0)
  })
})

describe('auth + /me round-trip', () => {
  const email = `vitest.${process.pid}@upm.org`

  it('login → token → PUT/GET prefs → 401 sin token', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email },
    })
    expect(login.statusCode).toBe(200)
    const { token, operator } = login.json()
    expect(operator.email).toBe(email)
    expect(operator.cargo).toBe('Legislador')

    const doc = { countries: ['AR'], topics: ['ambiente'], frequency: 'diario', language: 'es', notifications: false }
    const put = await app.inject({
      method: 'PUT',
      url: '/me/prefs',
      headers: { authorization: `Bearer ${token}` },
      payload: doc,
    })
    expect(put.statusCode).toBe(200)

    const get = await app.inject({
      method: 'GET',
      url: '/me/prefs',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(get.json()).toEqual(doc)

    expect((await app.inject({ method: 'GET', url: '/me/prefs' })).statusCode).toBe(401)
  })

  it('login 400 con email inválido', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'no-es-email' } })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /assistant sin ANTHROPIC_API_KEY', () => {
  it('→ 503 assistant unavailable', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/assistant',
      payload: { messages: [{ id: '1', role: 'user', content: 'hola' }] },
    })
    expect(res.statusCode).toBe(503)
    expect(res.json().error).toBe('assistant unavailable')
  })
})

describe('CORS', () => {
  it('preflight desde GH Pages → allow-origin correcto', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/feed',
      headers: {
        origin: 'https://soyalantapia.github.io',
        'access-control-request-method': 'GET',
      },
    })
    expect(res.headers['access-control-allow-origin']).toBe('https://soyalantapia.github.io')
  })

  it('origin no listado → sin allow-origin', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/feed',
      headers: { origin: 'https://evil.example.com', 'access-control-request-method': 'GET' },
    })
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})
