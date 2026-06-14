import nodemailer from 'nodemailer'
import type { Config } from '../config.js'

// Envío de email por SMTP (configurable por env: SMTP_HOST/PORT/USER/PASS/FROM).
// La password NUNCA está en el código: se carga como variable de entorno en Railway.

let transporter: nodemailer.Transporter | null = null

function getTransport(config: Config): nodemailer.Transporter | null {
  if (!config.smtpConfigured) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465, // 465 = TLS implícito; 587 = STARTTLS
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    })
  }
  return transporter
}

export async function sendOtpEmail(config: Config, to: string, code: string): Promise<void> {
  const tx = getTransport(config)
  if (!tx) throw new Error('SMTP no configurado')
  const from = config.SMTP_FROM || `App UPM <${config.SMTP_USER}>`
  await tx.sendMail({
    from,
    to,
    subject: `Tu código de acceso a App UPM: ${code}`,
    text: `Tu código de acceso es ${code}. Vence en 10 minutos. Si no lo pediste, ignorá este mensaje.`,
    html:
      `<div style="font-family:Inter,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px">` +
      `<h2 style="color:#0B3A66;margin:0 0 8px">App UPM</h2>` +
      `<p style="color:#334155;font-size:14px;margin:0 0 16px">Usá este código para ingresar:</p>` +
      `<div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#062B4D;background:#f1f5f9;border-radius:12px;padding:16px;text-align:center">${code}</div>` +
      `<p style="color:#64748b;font-size:12px;margin:16px 0 0">Vence en 10 minutos. Si no lo pediste, ignorá este mensaje.</p>` +
      `</div>`,
  })
}
