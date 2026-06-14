import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { operators } from '../db/schema.js'
import { signToken } from '../plugins/auth.js'
import type { CountryCode, Operator } from '../types.js'

// Réplica de deriveName() de client/src/lib/auth.tsx — mismo demo-login.
const DEMO = { name: 'Dr. Martín Pereira', cargo: 'Legislador', pais: 'UY' as CountryCode }

export function deriveOperator(email: string): { name: string; cargo: string; pais: CountryCode } {
  if (!email) return DEMO
  const lower = email.toLowerCase()
  if (lower.includes('martin') || lower.includes('pereira')) return DEMO
  const handle = email.split('@')[0] ?? ''
  const parts = handle.split(/[.\-_]+/).filter(Boolean)
  const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Legislador'
  return { name: `Dr. ${name}`, cargo: 'Legislador', pais: 'UY' }
}

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().optional(), // demo: ignorada
})

export function authRoutes(app: FastifyInstance, db: Db, jwtSecret: string) {
  app.post('/auth/login', async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues })
    }
    const email = parsed.data.email.toLowerCase()
    const derived = deriveOperator(email)
    const now = new Date()

    await db
      .insert(operators)
      .values({ email, name: derived.name, cargo: derived.cargo, pais: derived.pais, lastLoginAt: now })
      .onConflictDoUpdate({ target: operators.email, set: { lastLoginAt: now } })

    const operator: Operator = { email, ...derived, loggedAt: now.toISOString() }
    const token = await signToken(email, jwtSecret)
    return { token, operator }
  })
}
