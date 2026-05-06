import { store } from './store'

function buildUrl(path: string) {
  if (typeof window === 'undefined') return path
  const origin = window.location.origin + window.location.pathname.replace(/\/$/, '')
  return `${origin}/#${path}`
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

export async function shareLink(label: string, path: string) {
  const url = buildUrl(path)
  const ok = await copyToClipboard(url)
  if (ok) store.pushToast('success', `Enlace copiado · ${label}`)
  else store.pushToast('warning', 'No pudimos copiar el enlace')
}

export async function shareText(label: string, text: string) {
  const ok = await copyToClipboard(text)
  if (ok) store.pushToast('success', `${label} copiado al portapapeles`)
  else store.pushToast('warning', 'No pudimos copiar')
}
