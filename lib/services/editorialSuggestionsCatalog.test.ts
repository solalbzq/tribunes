import { describe, it, expect } from 'vitest'
import { parseSuggestedIds, getAvailableSuggestions, SUGGESTION_CATALOG } from './editorialSuggestionsCatalog'

describe('parseSuggestedIds', () => {
  it('accepts valid catalog ids', () => {
    expect(parseSuggestedIds(['volunteer_portrait', 'quiz'])).toEqual(['volunteer_portrait', 'quiz'])
  })

  it('never returns an id outside the fixed catalog, even if the model invents one', () => {
    expect(parseSuggestedIds(['volunteer_portrait', 'made_up_idea', 'DROP TABLE club'])).toEqual(['volunteer_portrait'])
  })

  it('deduplicates repeated ids', () => {
    expect(parseSuggestedIds(['quiz', 'quiz', 'archive'])).toEqual(['quiz', 'archive'])
  })

  it('caps the result at 5 even if more valid ids are provided', () => {
    const allIds = SUGGESTION_CATALOG.map(s => s.id)
    expect(allIds.length).toBeGreaterThan(5)
    expect(parseSuggestedIds(allIds)).toHaveLength(5)
  })

  it('handles malformed input without throwing', () => {
    expect(parseSuggestedIds(null)).toEqual([])
    expect(parseSuggestedIds('not an array')).toEqual([])
    expect(parseSuggestedIds(undefined)).toEqual([])
  })
})

describe('catalogue de saison', () => {
  it('has unique ids', () => {
    const ids = SUGGESTION_CATALOG.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('contains 8 seasonal ideas with valid months', () => {
    const seasonal = SUGGESTION_CATALOG.filter(s => s.months)
    expect(seasonal).toHaveLength(8)
    for (const s of seasonal) {
      expect(s.months!.length).toBeGreaterThan(0)
      expect(s.months!.every(m => Number.isInteger(m) && m >= 1 && m <= 12)).toBe(true)
    }
  })

  it('only offers a seasonal idea during its recommended months', () => {
    for (let month = 1; month <= 12; month++) {
      for (const s of getAvailableSuggestions(month)) {
        if (s.months) expect(s.months).toContain(month)
      }
    }
    expect(getAvailableSuggestions(12).map(s => s.id)).toContain('season_greetings')
    expect(getAvailableSuggestions(7).map(s => s.id)).not.toContain('season_greetings')
  })

  it('always offers the permanent ideas', () => {
    const permanent = SUGGESTION_CATALOG.filter(s => !s.months).map(s => s.id)
    for (let month = 1; month <= 12; month++) {
      const ids = getAvailableSuggestions(month).map(s => s.id)
      for (const id of permanent) expect(ids).toContain(id)
    }
  })

  it('rejects an out-of-season id returned by the model', () => {
    expect(parseSuggestedIds(['season_greetings', 'quiz'], 7)).toEqual(['quiz'])
    expect(parseSuggestedIds(['season_greetings', 'quiz'], 12)).toEqual(['season_greetings', 'quiz'])
  })

  it('routes recruitment and thanks ideas to clubAnnouncement', () => {
    const byId = (id: string) => SUGGESTION_CATALOG.find(s => s.id === id)!
    expect(byId('season_registrations').target?.category).toBe('RECRUITMENT')
    expect(byId('open_day').target?.category).toBe('RECRUITMENT')
    expect(byId('awards_ceremony').target?.category).toBe('THANKS')
    expect(byId('season_review').target?.category).toBe('THANKS')
  })
})
