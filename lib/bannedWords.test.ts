import { describe, it, expect } from 'vitest'
import { findBannedWordsInText, checkBannedWordsAcrossPlatforms } from './bannedWords'

describe('findBannedWordsInText', () => {
  it('detects a banned word regardless of case and accents', () => {
    expect(findBannedWordsInText('Quelle DÉCEPTION ce soir', 'déception')).toEqual(['déception'])
  })

  it('detects a multi-word banned expression', () => {
    expect(findBannedWordsInText('Une faible affluence ce week-end', 'faible affluence')).toEqual(['faible affluence'])
  })

  it('does not flag a banned word contained inside a different word', () => {
    // "carna" is not a real banned word here, but this checks word-boundary matching:
    // "carnaval" must not match a banned word "carna".
    expect(findBannedWordsInText('Le carnaval du club a été un succès', 'carna')).toEqual([])
  })

  it('ignores punctuation around the match', () => {
    expect(findBannedWordsInText('Quel échec, vraiment.', 'échec')).toEqual(['échec'])
  })

  it('returns an empty array when there are no banned words configured', () => {
    expect(findBannedWordsInText('un texte quelconque', null)).toEqual([])
    expect(findBannedWordsInText('un texte quelconque', '')).toEqual([])
  })

  it('returns an empty array when nothing matches', () => {
    expect(findBannedWordsInText('Belle victoire ce soir !', 'défaite, échec')).toEqual([])
  })
})

describe('checkBannedWordsAcrossPlatforms', () => {
  it('groups violations by platform and flags hasViolation', () => {
    const result = checkBannedWordsAcrossPlatforms(
      { instagram: 'Quelle déception...', facebook: 'Belle victoire !', whatsapp: 'Encore une déception' },
      'déception'
    )
    expect(result.hasViolation).toBe(true)
    expect(Object.keys(result.violationsByPlatform).sort()).toEqual(['instagram', 'whatsapp'])
    expect(result.violationsByPlatform.instagram).toEqual(['déception'])
  })

  it('reports no violation when the text is clean', () => {
    const result = checkBannedWordsAcrossPlatforms(
      { instagram: 'Belle victoire !', facebook: 'Bravo à tous', whatsapp: 'GG les gars' },
      'déception, échec'
    )
    expect(result.hasViolation).toBe(false)
    expect(result.violationsByPlatform).toEqual({})
  })
})
