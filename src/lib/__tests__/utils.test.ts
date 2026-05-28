import { describe, it, expect } from 'vitest'
import { hashString, seededWaveOff } from '../utils'

describe('hashString', () => {
  it('produce un valor en [0, 1)', () => {
    for (const input of ['hello', 'mundo', 'test-123', '']) {
      const result = hashString(input)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(1)
    }
  })

  it('es determinista: misma entrada → mismo output', () => {
    const inputs = ['a', 'abc', 'trama', 'quipu']
    for (const input of inputs) {
      expect(hashString(input)).toBe(hashString(input))
    }
  })

  it('entradas diferentes producen outputs diferentes (alta probabilidad)', () => {
    const a = hashString('alpha')
    const b = hashString('beta')
    expect(a).not.toBe(b)
  })
})

describe('seededWaveOff', () => {
  it('produce un valor en [0, 2π)', () => {
    const result = seededWaveOff('src', 'tgt', 'pred')
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThan(Math.PI * 2)
  })

  it('es determinista: mismos argumentos → mismo output', () => {
    const a = seededWaveOff('node-a', 'node-b', 'alianzaCon')
    const b = seededWaveOff('node-a', 'node-b', 'alianzaCon')
    expect(a).toBe(b)
  })

  it('diferentes predicados producen outputs diferentes', () => {
    const a = seededWaveOff('x', 'y', 'pred1')
    const b = seededWaveOff('x', 'y', 'pred2')
    expect(a).not.toBe(b)
  })

  it('commutar source y target produce resultado diferente', () => {
    const a = seededWaveOff('a', 'b', 'p')
    const b = seededWaveOff('b', 'a', 'p')
    expect(a).not.toBe(b)
  })
})
