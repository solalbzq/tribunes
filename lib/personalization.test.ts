import { describe, it, expect } from 'vitest'
import {
  buildPersonalizationPrefix,
  validateClubPersonalizationInput,
  validateOneTimeInstructions,
  validateTypeInstructions,
  resolvePersonalization,
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

describe('validateTypeInstructions', () => {
  it('accepts and trims a valid value', () => {
    expect(validateTypeInstructions('  reste factuel  ')).toEqual({ ok: true, value: 'reste factuel' })
  })

  it('rejects a value beyond the 500-character limit', () => {
    const result = validateTypeInstructions('a'.repeat(PERSONALIZATION_LIMITS.typeInstructions + 1))
    expect(result.ok).toBe(false)
  })
})

describe('resolvePersonalization — priorités', () => {
  const club = {
    contentTone: 'STANDARD',
    customInstructions: 'mentionne toujours le sponsor',
    signaturePhrase: 'Allez les rouges !',
    bannedWords: 'échec',
  }

  it('falls back to Tribunes/club defaults when nothing is overridden', () => {
    const result = resolvePersonalization({ club, postType: 'CLUB_ANNOUNCEMENT' })
    expect(result.voice).toBe('STANDARD')
    expect(result.signaturePhrase).toBe('Allez les rouges !')
    expect(result.prefix).toContain('mentionne toujours le sponsor')
  })

  it('a type override wins over the club identity, but not over a one-time request override', () => {
    const result = resolvePersonalization({
      club,
      postType: 'CUSTOM_POST',
      typeOverride: { voiceOverride: 'SOBER', signaturePhrase: 'Signature libre', customInstructions: 'ton neutre' },
    })
    expect(result.voice).toBe('SOBER')
    expect(result.signaturePhrase).toBe('Signature libre')
    expect(result.prefix).toContain('ton neutre')
  })

  it('a one-time request override wins over both the type override and the club identity (voice)', () => {
    const result = resolvePersonalization({
      club,
      postType: 'CUSTOM_POST',
      typeOverride: { voiceOverride: 'SOBER' },
      requestOverride: { voiceOverride: 'FUN' },
    })
    expect(result.voice).toBe('FUN')
  })

  it('stacks type-level and one-time instructions on top of the club-level ones', () => {
    const result = resolvePersonalization({
      club,
      postType: 'CUSTOM_POST',
      typeOverride: { customInstructions: 'consigne du type' },
      requestOverride: { oneTimeInstructions: 'consigne ponctuelle' },
    })
    const clubIdx = result.prefix.indexOf('mentionne toujours le sponsor')
    const typeIdx = result.prefix.indexOf('consigne du type')
    const requestIdx = result.prefix.indexOf('consigne ponctuelle')
    expect(clubIdx).toBeGreaterThanOrEqual(0)
    expect(typeIdx).toBeGreaterThan(clubIdx)
    expect(requestIdx).toBeGreaterThan(typeIdx)
  })

  it('an invalid/free-text voice override never leaks through — falls back to the next level', () => {
    const result = resolvePersonalization({
      club,
      postType: 'CUSTOM_POST',
      requestOverride: { voiceOverride: 'convivial et festif' },
    })
    expect(result.voice).toBe('STANDARD')
  })

  it('banned words always come from the club, never overridable by type or request', () => {
    const result = resolvePersonalization({
      club,
      postType: 'CUSTOM_POST',
      typeOverride: { customInstructions: 'peu importe' },
    })
    expect(result.prefix).toContain('échec')
  })

  it('signature falls back to the club when the type override does not define one', () => {
    const result = resolvePersonalization({
      club,
      postType: 'CUSTOM_POST',
      typeOverride: { customInstructions: 'sans signature propre' },
    })
    expect(result.signaturePhrase).toBe('Allez les rouges !')
  })
})
