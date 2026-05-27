import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, decodeHtml } from '@/lib/format'

describe('format', () => {
  describe('formatDate', () => {
    it('YYYY-MM-DD → DD/MM/YYYY', () => {
      expect(formatDate('2026-05-08')).toBe('08/05/2026')
    })
    it('devuelve original si no parsea', () => {
      expect(formatDate('08-05-2026')).toBe('08-05-2026')
    })
    it('null-safe', () => {
      expect(formatDate(undefined)).toBe('')
      expect(formatDate('')).toBe('')
    })
  })

  describe('formatDateTime', () => {
    it('YYYY-MM-DDTHH:MM:SS → DD/MM/YYYY HH:MM', () => {
      expect(formatDateTime('2026-05-08T18:42:00')).toBe('08/05/2026 18:42')
    })
    it('sin hora → solo fecha', () => {
      expect(formatDateTime('2026-05-08')).toBe('08/05/2026')
    })
  })

  describe('decodeHtml', () => {
    it('decodifica &quot;', () => {
      expect(decodeHtml('hola &quot;mundo&quot;')).toBe('hola "mundo"')
    })
    it('decodifica &amp; y &nbsp;', () => {
      expect(decodeHtml('A &amp; B')).toBe('A & B')
      expect(decodeHtml('A&nbsp;B')).toBe('A B')
    })
    it('null-safe', () => {
      expect(decodeHtml(undefined)).toBe('')
    })
  })
})
