import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import type { Config } from '../config.js'
import { operators } from '../db/schema.js'
import { signToken } from '../plugins/auth.js'
import { issueCode, verifyCode } from '../lib/otp.js'
import { sendOtpEmail } from '../lib/mailer.js'
import type { CountryCode, Operator } from '../types.js'

// Nombre legible derivado del email (sin persona demo). Editable luego en /me/prefs.
export function deriveName(email: string): { name: string; cargo: string; pais: CountryCode } {
  const handle = email.split('@')[0] ?? ''
  const parts = handle.split(/[.\-_]+/).filter(Boolean)
  const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Legislador'
  return { name, cargo: 'Legislador', pais: 'AR' }
}

async function upsertOperator(db: Db, email: string, config: Config) {
  const derived = deriveName(email)
  const now = new Date()
  await db
    .insert(operators)
    .values({ email, name: derived.name, cargo: derived.cargo, pais: derived.pais, lastLoginAt: now })
    .onConflictDoUpdate({ target: operators.email, set: { lastLoginAt: now } })
  const operator: Operator = { email, ...derived, loggedAt: now.toISOString() }
  const token = await signToken(email, config.JWT_SECRET, config.JWT_TTL)
  return { token, operator }
}

const EmailBody = z.object({ email: z.string().email() })
const VerifyBody = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) })
const LoginBody = z.object({ email: z.string().email(), password: z.string().optional() })

export function authRoutes(app: FastifyInstance, db: Db, config: Config) {
  const allowed = (email: string) =>
    config.allowedEmails.length === 0 || config.allowedEmails.includes(email.toLowerCase())

  // 1) Pedir código OTP: genera y manda por email (SMTP).
  app.post('/auth/request-code', async (req, reply) => {
    const parsed = EmailBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })
    const email = parsed.data.email.toLowerCase()
    if (!config.smtpConfigured) return reply.code(503).send({ error: 'email no configurado' })
    // Anti-enumeración: si no está en la allowlist, respondemos ok sin mandar nada.
    if (!allowed(email)) return { ok: true }
    const issued = issueCode(email)
    if (!issued.ok) {
      return reply.code(429).send({ error: 'too many requests', retryAfterMs: issued.retryAfterMs })
    }
    try {
      await sendOtpEmail(config, email, issued.code)
    } catch (err) {
      req.log.error({ err }, 'fallo envío OTP')
      return reply.code(502).send({ error: 'no se pudo enviar el email' })
    }
    return { ok: true }
  })

  // 2) Verificar código: si es válido, crea/actualiza el operador y devuelve JWT.
  app.post('/auth/verify', async (req, reply) => {
    const parsed = VerifyBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })
    const email = parsed.data.email.toLowerCase()
    const result = verifyCode(email, parsed.data.code)
    if (result !== 'ok') {
      const map: Record<string, number> = { invalid: 401, expired: 410, too_many: 429 }
      return reply.code(map[result] ?? 401).send({ error: result })
    }
    return upsertOperator(db, email, config)
  })

  // 3) Login legacy (email→token, SIN código). DEPRECADO: solo back-compat del
  //    sync mientras el front migra a OTP. En prod real se quita (no validar nada
  //    es inseguro). No usa persona demo.
  app.post('/auth/login', async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues })
    return upsertOperator(db, parsed.data.email.toLowerCase(), config)
  })
}
