import { describe, expect, it } from 'vitest'
import { detectTopic } from '../../src/ingest/topic.js'

describe('detectTopic (portado del worker)', () => {
  const cases: [string, string][] = [
    ['protección del medio ambiente y cambio climático', 'ambiente'],
    ['corredor bioceánico vial', 'corredores-bioceanicos'],
    ['integración regional del Mercosur', 'integracion-regional'],
    ['paridad de género en listas', 'genero'],
    ['reforma educacional y ensino', 'educacion'],
    ['emergencia sanitaria en salud pública', 'salud'],
    ['tarifa de energia elétrica', 'energia'],
    ['tratado internacional bilateral', 'rrii'],
    ['seguridad en zonas de frontera', 'seguridad'],
    ['régimen tributario y fiscal', 'economia-regional'],
  ]
  for (const [text, expected] of cases) {
    it(`"${text.slice(0, 30)}…" → ${expected}`, () => {
      expect(detectTopic(text)).toBe(expected)
    })
  }

  it('default → integracion-regional', () => {
    expect(detectTopic('texto totalmente neutro sin keywords')).toBe('integracion-regional')
    expect(detectTopic('')).toBe('integracion-regional')
  })
})
