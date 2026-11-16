import { describe, expect, it } from 'vitest'
import { buildDemoText, clubInitials, demoOutcome } from './demoPost'

const base = { club: 'RC Nîmes', opponent: 'Alès', scoreClub: 3, scoreOpponent: 1, date: '2026-10-24', tone: 'sobre' as const }

describe('demoPost', () => {
  it('détecte le résultat', () => {
    expect(demoOutcome(2, 1)).toBe('victoire')
    expect(demoOutcome(1, 1)).toBe('nul')
    expect(demoOutcome(0, 1)).toBe('defaite')
  })
  it('met à jour le texte avec le score et le nom', () => {
    expect(buildDemoText(base)).toContain('RC Nîmes')
    expect(buildDemoText(base)).toContain('3-1')
    expect(buildDemoText({ ...base, scoreClub: 0, scoreOpponent: 2 })).toContain('incliné 0-2')
  })
  it('gère les champs vides', () => {
    const t = buildDemoText({ ...base, club: '', opponent: '', date: '' })
    expect(t).toContain('Votre club')
    expect(t).toContain('récemment')
  })
  it('les 3 tons donnent des textes différents', () => {
    const t = ['enthousiaste', 'sobre', 'humoristique'].map((tone) => buildDemoText({ ...base, tone: tone as never }))
    expect(new Set(t).size).toBe(3)
  })
  it('initiales', () => {
    expect(clubInitials('Rugby Club Nîmes')).toBe('RC')
    expect(clubInitials('')).toBe('CL')
  })
})
