import { describe, expect, it } from 'vitest'
import { generateHashtags, toHashtag } from './hashtagTool'

describe('toHashtag', () => {
  it('retire accents, espaces et mots vides', () => {
    expect(toHashtag('Étoile Sportive d’Auch')).toBe('#EtoileSportiveAuch')
    expect(toHashtag('  ')).toBe('')
  })
})

describe('generateHashtags', () => {
  it('place le club et la ville en premier', () => {
    const tags = generateHashtags({ sport: 'Football', moment: 'resultat', clubName: 'AS Muret', city: 'Muret' })
    expect(tags.slice(0, 2)).toEqual(['#ASMuret', '#Muret'])
    expect(tags).toContain('#Football')
    expect(tags).toContain('#Resultat')
  })

  it('n’a pas de doublon, même sans club', () => {
    const tags = generateHashtags({ sport: 'Autre sport', moment: 'evenement' })
    expect(new Set(tags.map((t) => t.toLowerCase())).size).toBe(tags.length)
    expect(tags).toContain('#Sport')
  })
})
