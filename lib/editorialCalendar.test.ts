import { describe, expect, it } from 'vitest'
import { EDITORIAL_CALENDAR, ideasForMonth } from './editorialCalendar'

describe('EDITORIAL_CALENDAR', () => {
  it('couvre 10 mois, de septembre à juin', () => {
    expect(EDITORIAL_CALENDAR).toHaveLength(10)
    expect(EDITORIAL_CALENDAR[0].name).toBe('Septembre')
    expect(EDITORIAL_CALENDAR[9].name).toBe('Juin')
  })

  it('donne 3 à 5 idées par mois, toutes présentes dans le catalogue', () => {
    for (const month of EDITORIAL_CALENDAR) {
      expect(month.ideaIds.length).toBeGreaterThanOrEqual(3)
      expect(month.ideaIds.length).toBeLessThanOrEqual(5)
      expect(ideasForMonth(month)).toHaveLength(month.ideaIds.length)
      expect(new Set(month.ideaIds).size).toBe(month.ideaIds.length)
    }
  })
})
