import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  ALLOWED_ORIGINS: z
    .string()
    .default('https://soyalantapia.github.io,http://localhost:5188,http://127.0.0.1:5188'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET muy corto (mín 16 chars)'),
  ANTHROPIC_API_KEY: z.string().optional(),
  // IA gratuita pluggable (free tier). Si no hay ANTHROPIC, se usa Gemini.
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  STATIC_DATA_BASE: z.string().default('https://soyalantapia.github.io/app-upm/data'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default('development'),
  // Auth real (login por código OTP enviado por email vía SMTP).
  JWT_TTL: z.string().default('7d'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(), // ej. "App UPM <noreply@tudominio.com>"
  // Allowlist opcional: si está, SOLO estos emails pueden pedir código (coma-separados).
  ALLOWED_EMAILS: z.string().optional(),
})

export type Config = ReturnType<typeof loadConfig>

export function loadConfig() {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const detail = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Config inválida: ${detail}`)
  }
  const env = parsed.data
  return {
    ...env,
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
    allowedEmails: (env.ALLOWED_EMAILS ?? '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
    smtpConfigured: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
    isProd: env.NODE_ENV === 'production',
  }
}
