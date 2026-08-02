import { describe, it, expect } from 'vitest'
import { parseSuggestedIds, SUGGESTION_CATALOG } from './editorialSuggestionsCatalog'

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
