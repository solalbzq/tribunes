import { describe, expect, it } from 'vitest'
import { SPORT_VOCAB } from './sports'

describe('SPORT_VOCAB hashtags', () => {
  it('ne contient aucun doublon par sport', () => {
    for (const [sport, vocab] of Object.entries(SPORT_VOCAB)) {
      const lower = vocab.hashtags.map((h) => h.toLowerCase())
      expect(new Set(lower).size, sport).toBe(lower.length)
    }
  })

  it('ne contient ni #NBA ni #AmourDuJeu', () => {
    const all = Object.values(SPORT_VOCAB).flatMap((v) => v.hashtags)
    expect(all).not.toContain('#NBA')
    expect(all).not.toContain('#AmourDuJeu')
  })
})
