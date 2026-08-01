import { describe, it, expect } from 'vitest'
import {
  buildPersonalizationPrefix,
  validateClubPersonalizationInput,
  validateOneTimeInstructions,
  PERSONALIZATION_LIMITS,
} from './personalization'

describe('validateClubPersonalizationInput', () => {
  it('trims and accepts valid values', () => {
    const result = validateClubPersonalizationInput({
      customInstructions: '  Toujours citer le sponsor  ',
      signaturePhrase: '  Allez les rouges !  ',
      bannedWords: ' déception ,  échec ',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.customInstructions).toBe('Toujours citer le sponsor')
      expect(result.value.signaturePhrase).toBe('Allez les rouges !')
      expect(result.value.bannedWords).toBe('déception, échec')
    }
  })

  it('treats a whitespace-only string as empty (null)', () => {
    const result = validateClubPersonalizationInput({ customInstructions: '    ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.customInstructions).toBeNull()
  })

  it('rejects customInstructions beyond the limit', () => {
    const result = validateClubPersonalizationInput({
      customInstructions: 'a'.repeat(PERSONALIZATION_LIMITS.customInstructions + 1),
    })
    expect(result.ok).toBe(false)
  })

  it('rejects signaturePhrase beyond the limit', () => {
    const result = validateClubPersonalizationInput({
      signaturePhrase: 'a'.repeat(PERSONALIZATION_LIMITS.signaturePhrase + 1),
    })
    expect(result.ok).toBe(false)
  })

  it('rejects more than 30 banned expressions', () => {
    const words = Array.from({ length: PERSONALIZATION_LIMITS.bannedWordsMaxItems + 1 }, (_, i) => `mot${i}`)
    const result = validateClubPersonalizationInput({ bannedWords: words.join(',') })
    expect(result.ok).toBe(false)
  })

  it('rejects a single banned expression beyond the per-item length limit', () => {
    const result = validateClubPersonalizationInput({
      bannedWords: 'a'.repeat(PERSONALIZATION_LIMITS.bannedWordMaxLength + 1),
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a single-character banned expression (would match almost any generated text)', () => {
    const result = validateClubPersonalizationInput({ bannedWords: 'déception, a' })
    expect(result.ok).toBe(false)
  })
})

describe('validateOneTimeInstructions', () => {
  it('accepts and trims a valid instruction', () => {
    const result = validateOneTimeInstructions('  reste factuel  ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('reste factuel')
  })

  it('rejects an instruction beyond the limit', () => {
    const result = validateOneTimeInstructions('a'.repeat(PERSONALIZATION_LIMITS.oneTimeInstructions + 1))
    expect(result.ok).toBe(false)
  })

  it('accepts undefined/null as "no instruction"', () => {
    expect(validateOneTimeInstructions(undefined)).toEqual({ ok: true, value: null })
    expect(validateOneTimeInstructions(null)).toEqual({ ok: true, value: null })
  })
})

describe('buildPersonalizationPrefix', () => {
  it('returns an empty string when nothing is configured', () => {
    expect(buildPersonalizationPrefix({})).toBe('')
  })

  it('stacks club instructions then the one-time override, in order', () => {
    const prefix = buildPersonalizationPrefix(
      { customInstructions: 'toujours citer le sponsor' },
      'pour ce post uniquement, sois bref'
    )
    const clubIdx = prefix.indexOf('toujours citer le sponsor')
    const overrideIdx = prefix.indexOf('pour ce post uniquement')
    expect(clubIdx).toBeGreaterThanOrEqual(0)
    expect(overrideIdx).toBeGreaterThan(clubIdx)
  })
})
