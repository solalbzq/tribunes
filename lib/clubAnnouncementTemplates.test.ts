import { describe, expect, it } from 'vitest'
import { CLUB_ANNOUNCEMENT_TEMPLATES } from './clubAnnouncementTemplates'

const CATEGORIES = ['RECRUITMENT', 'SPONSOR', 'CLUB_LIFE', 'VOLUNTEER', 'THANKS']

describe('CLUB_ANNOUNCEMENT_TEMPLATES', () => {
  it('propose 5 modèles aux clés uniques', () => {
    expect(CLUB_ANNOUNCEMENT_TEMPLATES).toHaveLength(5)
    expect(new Set(CLUB_ANNOUNCEMENT_TEMPLATES.map((t) => t.key)).size).toBe(5)
  })

  it('utilise des catégories valides et des textes remplis', () => {
    for (const t of CLUB_ANNOUNCEMENT_TEMPLATES) {
      expect(CATEGORIES).toContain(t.category)
      expect(t.label).not.toBe('')
      expect(t.title).not.toBe('')
      expect(t.description).not.toBe('')
    }
  })

  it("n'invente aucun chiffre", () => {
    for (const t of CLUB_ANNOUNCEMENT_TEMPLATES) {
      expect(`${t.title} ${t.description}`).not.toMatch(/\d/)
    }
  })
})
