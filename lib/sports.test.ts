import { describe, expect, it } from 'vitest'
import { SPORT_VOCAB, getSportVocab, getVocabHints } from './sports'

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

describe('Rugby, Badminton et Judo', () => {
  it('sont connus du vocabulaire', () => {
    for (const sport of ['Rugby', 'Badminton', 'Judo']) {
      expect(SPORT_VOCAB[sport], sport).toBeDefined()
      expect(getSportVocab(sport).hashtags).toContain(`#${sport}`)
      expect(getVocabHints(sport), sport).not.toBe('')
    }
  })

  it('compte le judo en combats, sans score numérique', () => {
    expect(SPORT_VOCAB.Judo.scoreUnit).toBe('combat')
  })
})
