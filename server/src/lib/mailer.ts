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

const FONT = `-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

// Email OTP institucional, robusto en clientes de correo (tablas + CSS inline +
// fuentes de sistema + colores sólidos + atributos bgcolor + ghost-table MSO para
// Outlook). Identidad azul UPM. Diseño "acento moderno".
function otpEmailHtml(code: string, year: number): string {
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Tu código de acceso · App UPM</title>
<!--[if mso]>
<style type="text/css">table{border-collapse:collapse;border-spacing:0;margin:0;}div,td{padding:0;}</style>
<![endif]-->
<style type="text/css">
@media only screen and (max-width:600px){
  .container{width:100% !important;}
  .px{padding-left:24px !important;padding-right:24px !important;}
  .code-box{font-size:30px !important;letter-spacing:8px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#F6F8FB;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:#F6F8FB;">Usá este código de un solo uso para ingresar a App UPM. Vence en 10 minutos.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6F8FB" style="background-color:#F6F8FB;">
<tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:600px;max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
<tr><td height="6" bgcolor="#2F80ED" style="height:6px;line-height:6px;font-size:6px;background-color:#2F80ED;">&nbsp;</td></tr>
<tr><td class="px" style="padding:36px 48px 8px 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" valign="middle" style="width:44px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" valign="middle" width="44" height="44" bgcolor="#062B4D" style="width:44px;height:44px;background-color:#062B4D;border-radius:10px;font-family:${FONT};font-size:22px;line-height:22px;font-weight:700;color:#FFFFFF;text-align:center;">U</td>
</tr></table></td>
<td valign="middle" style="padding-left:14px;font-family:${FONT};">
<div style="font-size:16px;line-height:20px;font-weight:700;color:#0F172A;letter-spacing:0.2px;">App UPM</div>
<div style="font-size:13px;line-height:18px;color:#64748B;">Asistente IA del Legislador</div>
</td></tr></table>
</td></tr>
<tr><td class="px" style="padding:28px 48px 0 48px;font-family:${FONT};">
<h1 style="margin:0;font-size:24px;line-height:30px;mso-line-height-rule:exactly;font-weight:700;color:#0F172A;letter-spacing:-0.2px;">Tu código de acceso</h1>
</td></tr>
<tr><td class="px" style="padding:14px 48px 0 48px;font-family:${FONT};">
<p style="margin:0;font-size:16px;line-height:24px;color:#334155;">Usá este código para ingresar a App UPM:</p>
</td></tr>
<tr><td class="px" style="padding:20px 48px 0 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="code-box" align="center" bgcolor="#DCEBFA" style="background-color:#DCEBFA;border:1px solid #BFDBFE;border-radius:12px;padding:22px 16px;font-family:Consolas,'SF Mono',${FONT};font-size:32px;line-height:38px;mso-line-height-rule:exactly;font-weight:700;color:#062B4D;letter-spacing:12px;text-align:center;">${code}</td>
</tr></table>
</td></tr>
<tr><td class="px" style="padding:18px 48px 0 48px;font-family:${FONT};">
<p style="margin:0;font-size:15px;line-height:22px;color:#334155;">Vence en 10 minutos.</p>
</td></tr>
<tr><td class="px" style="padding:24px 48px 0 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#E2E8F0" style="height:1px;line-height:1px;font-size:1px;background-color:#E2E8F0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td class="px" style="padding:20px 48px 36px 48px;font-family:${FONT};">
<p style="margin:0;font-size:14px;line-height:21px;color:#64748B;">Si no pediste este código, ignorá este mensaje. Tu cuenta sigue protegida.</p>
</td></tr>
<tr><td class="px" bgcolor="#F6F8FB" style="background-color:#F6F8FB;border-top:1px solid #E2E8F0;padding:20px 48px;font-family:${FONT};">
<p style="margin:0;font-size:12px;line-height:18px;color:#64748B;text-align:center;">App UPM &middot; Acceso institucional &middot; ${year}</p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`
}

export async function sendOtpEmail(config: Config, to: string, code: string): Promise<void> {
  const tx = getTransport(config)
  if (!tx) throw new Error('SMTP no configurado')
  const from = config.SMTP_FROM || `App UPM <${config.SMTP_USER}>`
  const year = new Date().getFullYear()
  await tx.sendMail({
    from,
    to,
    subject: `${code} es tu código de acceso a App UPM`,
    text: `App UPM — Asistente IA del Legislador\n\nTu código de acceso\n\nUsá este código para ingresar a App UPM:\n\n    ${code}\n\nVence en 10 minutos.\n\nSi no pediste este código, ignorá este mensaje. Tu cuenta sigue protegida.\n\n—\nApp UPM · Acceso institucional · ${year}`,
    html: otpEmailHtml(code, year),
  })
}
