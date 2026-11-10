import { describe, expect, it } from 'vitest'
import { announcementReminder, isUpcomingEvent, suggestionPrefill, tournamentReminder } from './reusePrefill'
import { findSuggestionTemplate } from '@/lib/services/editorialSuggestionsCatalog'

const DAY = 86400000
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString()

describe('isUpcomingEvent', () => {
  it('accepte un événement dans le futur', () => {
    expect(isUpcomingEvent(iso(3))).toBe(true)
  })
  it('refuse un événement passé', () => {
    expect(isUpcomingEvent(iso(-3))).toBe(false)
  })
})

describe('announcementReminder', () => {
  it("reprend uniquement les infos de l'événement d'origine", () => {
    const r = announcementReminder({ opponent: 'FC Nord', matchDate: '2027-01-10T00:00:00.000Z', isHome: false })
    expect(r.target).toBe('announcement')
    expect(r.values).toEqual({
      opponent: 'FC Nord',
      matchDate: '2027-01-10',
      isHome: false,
      note: "Rappel de la veille : c'est demain !",
    })
  })
})

describe('tournamentReminder', () => {
  it('prépare le titre « Demain : … » et reprend les matchs enregistrés', () => {
    const r = tournamentReminder({
      tournamentName: 'Coupe du club',
      matchDate: '2027-01-10T00:00:00.000Z',
      venue: 'Gymnase',
      parsedData: { clubMatches: [{ opponent: 'A', time: '14h', round: 'Finale' }, { bad: true }] },
    })
    expect(r.values).toEqual({
      tournamentName: 'Demain : Coupe du club',
      matchDate: '2027-01-10',
      venue: 'Gymnase',
      matches: [{ opponent: 'A', time: '14h', round: 'Finale' }],
    })
  })
})

describe('suggestionPrefill', () => {
  it('route une idée liée à une catégorie vers l’annonce du club', () => {
    const r = suggestionPrefill(findSuggestionTemplate('recruitment')!)
    expect(r.target).toBe('clubAnnouncement')
  })
  it('route les autres idées vers la publication libre', () => {
    const r = suggestionPrefill(findSuggestionTemplate('quiz')!)
    expect(r.target).toBe('customPost')
  })
})
