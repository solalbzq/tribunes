import { describe, expect, it } from 'vitest'
import { FAQ, faqJsonLd } from './aidePage'

describe('FAQ', () => {
  it('contient 8 à 10 questions uniques, chacune avec sa source', () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(8)
    expect(FAQ.length).toBeLessThanOrEqual(10)
    expect(new Set(FAQ.map((f) => f.question)).size).toBe(FAQ.length)
    for (const f of FAQ) expect(f.source.length).toBeGreaterThan(0)
  })

  it('produit un balisage FAQPage complet', () => {
    const ld = faqJsonLd()
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toHaveLength(FAQ.length)
  })
})
