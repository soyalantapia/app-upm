import { describe, expect, it } from 'vitest'
import { deriveOperator } from '../../src/routes/auth.js'

describe('deriveOperator (réplica de client auth.tsx)', () => {
  it('martin/pereira → operador DEMO', () => {
    expect(deriveOperator('martin.pereira@upm.org')).toEqual({
      name: 'Dr. Martín Pereira',
      cargo: 'Legislador',
      pais: 'UY',
    })
    expect(deriveOperator('pereira@otro.org').name).toBe('Dr. Martín Pereira')
  })

  it('email genérico → Dr. {Nombre} / Legislador / UY', () => {
    const d = deriveOperator('ana.garcia@parlamento.gov')
    expect(d).toEqual({ name: 'Dr. Ana Garcia', cargo: 'Legislador', pais: 'UY' })
  })

  it('email vacío → DEMO', () => {
    expect(deriveOperator('').name).toBe('Dr. Martín Pereira')
  })
})
