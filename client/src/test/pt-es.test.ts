import { describe, it, expect } from 'vitest'
import { translatePtEs, looksPortuguese } from '@/lib/pt-es'

describe('pt-es', () => {
  describe('looksPortuguese', () => {
    it('detecta marcas claras de PT', () => {
      expect(looksPortuguese('Sessão Solene')).toBe(true)
      expect(looksPortuguese('Aprovação Pública')).toBe(true)
      expect(looksPortuguese('Não Deliberativa')).toBe(true)
    })
    it('no falla con español puro', () => {
      expect(looksPortuguese('Sesión ordinaria del Senado')).toBe(false)
      expect(looksPortuguese('Ley 27.742')).toBe(false)
    })
    it('null-safe', () => {
      expect(looksPortuguese(undefined)).toBe(false)
      expect(looksPortuguese(null)).toBe(false)
      expect(looksPortuguese('')).toBe(false)
    })
  })

  describe('translatePtEs', () => {
    it('traduce términos institucionales clave', () => {
      const r = translatePtEs('Sessão Não Deliberativa Solene').toLowerCase()
      expect(r).toContain('sesión')
      expect(r).toContain('solemne')
    })
    it('traduce Câmara dos Deputados', () => {
      const r = translatePtEs('Audiência da Câmara dos Deputados')
      expect(r).toContain('Cámara de Diputados')
    })
    it('no toca texto que ya está en ES', () => {
      const input = 'Sesión ordinaria del Senado'
      expect(translatePtEs(input)).toBe(input)
    })
    it('null-safe', () => {
      expect(translatePtEs(undefined)).toBe('')
      expect(translatePtEs(null)).toBe('')
    })
  })
})
