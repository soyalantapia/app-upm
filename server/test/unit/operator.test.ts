import { describe, expect, it } from 'vitest'
import { deriveName } from '../../src/routes/auth.js'

describe('deriveName (producción · sin persona demo)', () => {
  it('deriva nombre del handle del email, sin "Dr." ni persona Pereira', () => {
    expect(deriveName('ana.garcia@parlamento.gov')).toEqual({
      name: 'Ana Garcia',
      cargo: 'Legislador',
      pais: 'AR',
    })
  })

  it('martin/pereira ya NO devuelven la persona demo', () => {
    expect(deriveName('martin.pereira@upm.org').name).toBe('Martin Pereira')
    expect(deriveName('pereira@otro.org').name).toBe('Pereira')
  })

  it('handle sin separadores → capitaliza', () => {
    expect(deriveName('legislador@x.org').name).toBe('Legislador')
  })
})
