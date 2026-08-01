import { describe, it, expect } from 'vitest'
import { contrastRatio } from './colorDetection'

describe('contrastRatio', () => {
  it('returns the maximal ratio (21) for pure black vs pure white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#2563eb', '#2563eb')).toBeCloseTo(1, 5)
  })

  it('is symmetric regardless of argument order', () => {
    const a = contrastRatio('#111827', '#e94560')
    const b = contrastRatio('#e94560', '#111827')
    expect(a).toBeCloseTo(b, 10)
  })

  it('flags a low-contrast pair below a reasonable usability threshold', () => {
    expect(contrastRatio('#1a1a2e', '#1a1a3a')).toBeLessThan(1.5)
  })
})
