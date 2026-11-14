import { describe, expect, it } from 'vitest'
import { MODEL_PAGES, getModelPage } from './modelPages'

describe('MODEL_PAGES', () => {
  it('propose 4 pages', () => {
    expect(MODEL_PAGES).toHaveLength(4)
  })

  it('a des slugs, titres et descriptions uniques', () => {
    for (const key of ['slug', 'title', 'description'] as const) {
      expect(new Set(MODEL_PAGES.map((p) => p[key])).size).toBe(MODEL_PAGES.length)
    }
  })

  it('propose 3 exemples et au moins un conseil par page', () => {
    for (const p of MODEL_PAGES) {
      expect(p.examples).toHaveLength(3)
      expect(p.tips.length).toBeGreaterThan(0)
    }
  })

  it('retrouve une page par son slug', () => {
    expect(getModelPage('annonce-tournoi')?.slug).toBe('annonce-tournoi')
    expect(getModelPage('inconnu')).toBeUndefined()
  })
})
