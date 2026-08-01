import { describe, it, expect } from 'vitest'
import { hasCustomPostVisualOverride, resolveCustomPostVisualKind } from './visualLayout'

describe('resolveCustomPostVisualKind / hasCustomPostVisualOverride', () => {
  it('falls back to clubAnnouncement when postVisualConfigs is absent', () => {
    expect(resolveCustomPostVisualKind(undefined)).toBe('clubAnnouncement')
    expect(resolveCustomPostVisualKind(null)).toBe('clubAnnouncement')
    expect(hasCustomPostVisualOverride(undefined)).toBe(false)
  })

  it('falls back to clubAnnouncement when only other kinds are customized', () => {
    const raw = { clubAnnouncement: { elements: [{ id: 'logo' }] } }
    expect(resolveCustomPostVisualKind(raw)).toBe('clubAnnouncement')
    expect(hasCustomPostVisualOverride(raw)).toBe(false)
  })

  it('resolves to customPost once a flat (legacy) override is saved', () => {
    const raw = { customPost: { elements: [{ id: 'logo' }] } }
    expect(hasCustomPostVisualOverride(raw)).toBe(true)
    expect(resolveCustomPostVisualKind(raw)).toBe('customPost')
  })

  it('resolves to customPost once a per-format override is saved (post or story)', () => {
    expect(resolveCustomPostVisualKind({ customPost: { post: { elements: [{ id: 'logo' }] } } })).toBe('customPost')
    expect(resolveCustomPostVisualKind({ customPost: { story: { elements: [{ id: 'logo' }] } } })).toBe('customPost')
  })

  it('does not treat an empty customPost entry as an override', () => {
    expect(resolveCustomPostVisualKind({ customPost: {} })).toBe('clubAnnouncement')
    expect(resolveCustomPostVisualKind({ customPost: { post: {} } })).toBe('clubAnnouncement')
  })
})
