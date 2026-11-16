import { describe, expect, it } from 'vitest'
import { formatResetDate, nextQuotaResetDate, quotaNotice } from './quotaNotice'

describe('nextQuotaResetDate', () => {
  it('renvoie le 1er du mois suivant', () => {
    expect(nextQuotaResetDate(new Date('2026-11-12T09:15:00Z')).toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })
  it('passe à l’année suivante en décembre', () => {
    expect(nextQuotaResetDate(new Date('2026-12-31T23:59:00Z')).toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })
  it('reste en UTC le dernier soir du mois', () => {
    expect(nextQuotaResetDate(new Date('2026-11-30T23:30:00Z')).toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })
})

describe('formatResetDate', () => {
  it('écrit « 1er » suivi du mois en toutes lettres', () => {
    expect(formatResetDate(new Date('2026-12-01T00:00:00Z'))).toBe('1er décembre 2026')
  })
})

describe('quotaNotice', () => {
  const now = new Date('2026-11-12T09:15:00Z')

  it('s’affiche quand le quota gratuit est épuisé, avec la date de remise à zéro', () => {
    const n = quotaNotice({ plan: 'FREE', used: 3, limit: 3 }, now)
    expect(n?.message).toBe(
      'Vous avez utilisé vos 3 visuels du mois. Ils reviennent le 1er décembre 2026. Passez au plan Club pour des publications illimitées.',
    )
    expect(n?.resetDate).toBe('2026-12-01T00:00:00.000Z')
  })
  it('ne s’affiche pas tant qu’il reste des générations', () => {
    expect(quotaNotice({ plan: 'FREE', used: 2, limit: 3 }, now)).toBeNull()
  })
  it('ne s’affiche pas pour les plans Club et Pro', () => {
    expect(quotaNotice({ plan: 'CLUB', used: 50, limit: null }, now)).toBeNull()
    expect(quotaNotice({ plan: 'PRO', used: 50, limit: null }, now)).toBeNull()
  })
})
