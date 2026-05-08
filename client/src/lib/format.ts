// Helpers de formato para la UI.

// "2026-05-08" → "08/05/2026". Si la fecha no parsea, devuelve el string original.
export function formatDate(d?: string): string {
  if (!d) return ''
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d
}

// "2026-05-08T18:42:00" o "2026-05-08 18:42" → "08/05/2026 18:42"
export function formatDateTime(d?: string): string {
  if (!d) return ''
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2}:\d{2})?/)
  if (!m) return d
  const date = `${m[3]}/${m[2]}/${m[1]}`
  return m[4] ? `${date} ${m[4]}` : date
}
