import { describe, expect, it } from 'vitest'
import { SPORT_PAGES, getSportPage } from './sportPages'
import { SPORT_VOCAB } from './sports'

describe('SPORT_PAGES', () => {
  it('couvre chaque sport géré', () => {
    expect(SPORT_PAGES.map((p) => p.sport).sort()).toEqual(Object.keys(SPORT_VOCAB).sort())
  })

  it('a des slugs, titres et descriptions uniques', () => {
    for (const key of ['slug', 'title', 'description'] as const) {
      expect(new Set(SPORT_PAGES.map((p) => p[key])).size).toBe(SPORT_PAGES.length)
    }
  })

  it('propose 3 exemples par sport', () => {
    for (const p of SPORT_PAGES) expect(p.examples).toHaveLength(3)
  })

  it('retrouve une page par son slug', () => {
    expect(getSportPage('handball')?.sport).toBe('Handball')
    expect(getSportPage('inconnu')).toBeUndefined()
  })
})
