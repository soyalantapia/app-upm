import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

// Códigos OTP en memoria (sin tabla nueva): suficiente para 1 instancia.
// Un redeploy invalida los códigos pendientes (el usuario pide uno nuevo).
type Entry = { hash: string; expiresAt: number; attempts: number; sentAt: number }
const store = new Map<string, Entry>()

const TTL_MS = 10 * 60 * 1000 // 10 min
const RESEND_COOLDOWN_MS = 60 * 1000 // 1 código por minuto por email
const MAX_ATTEMPTS = 5

function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${email}:${code}`).digest('hex')
}

export type IssueResult = { ok: true; code: string } | { ok: false; retryAfterMs: number }

// Genera un código de 6 dígitos para el email. Respeta cooldown anti-spam.
export function issueCode(email: string): IssueResult {
  const now = Date.now()
  const prev = store.get(email)
  if (prev && now - prev.sentAt < RESEND_COOLDOWN_MS) {
    return { ok: false, retryAfterMs: RESEND_COOLDOWN_MS - (now - prev.sentAt) }
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  store.set(email, { hash: hashCode(email, code), expiresAt: now + TTL_MS, attempts: 0, sentAt: now })
  return { ok: true, code }
}

export type VerifyResult = 'ok' | 'invalid' | 'expired' | 'too_many'

export function verifyCode(email: string, code: string): VerifyResult {
  const entry = store.get(email)
  if (!entry) return 'invalid'
  if (Date.now() > entry.expiresAt) {
    store.delete(email)
    return 'expired'
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(email)
    return 'too_many'
  }
  entry.attempts++
  const a = Buffer.from(entry.hash)
  const b = Buffer.from(hashCode(email, code))
  const match = a.length === b.length && timingSafeEqual(a, b)
  if (!match) return 'invalid'
  store.delete(email) // un código se usa una sola vez
  return 'ok'
}
