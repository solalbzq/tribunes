import { describe, it, expect } from 'vitest'
import { resolveVoiceOverride, CLUB_VOICES } from './voice'

describe('resolveVoiceOverride', () => {
  it('accepts a recognized voice override', () => {
    expect(resolveVoiceOverride('FUN', 'STANDARD')).toBe('FUN')
    expect(resolveVoiceOverride('SOBER', 'STANDARD')).toBe('SOBER')
  })

  it('falls back when the override is empty, absent, or not a valid ClubVoice', () => {
    expect(resolveVoiceOverride('', 'SOBER')).toBe('SOBER')
    expect(resolveVoiceOverride(undefined, 'SOBER')).toBe('SOBER')
    expect(resolveVoiceOverride(null, 'SOBER')).toBe('SOBER')
    // Regression: a free-text mood/angle description (ex: CustomPostData.desiredMood
    // sent by mistake) must never be interpreted as a voice override.
    expect(resolveVoiceOverride('convivial et festif', 'STANDARD')).toBe('STANDARD')
    expect(resolveVoiceOverride(42, 'STANDARD')).toBe('STANDARD')
  })

  it('only recognizes the 3 declared club voices', () => {
    for (const v of CLUB_VOICES) {
      expect(resolveVoiceOverride(v, 'other')).toBe(v)
    }
  })
})
