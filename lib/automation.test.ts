import { describe, it, expect, vi } from 'vitest'

// resolveEffectiveMode -> checkAutomationAllowed -> resolvePlanForClub touche la
// base (Prisma) : on la mocke pour tester resolveInitialStatus comme un vrai
// test d'intégration de la logique de statut, sans dépendre d'une DB de test.
vi.mock('./org', () => ({
  resolvePlanForClub: vi.fn(async () => ({ plan: 'PRO' as const, orgId: 'org_1' })),
}))

const { resolveInitialStatus } = await import('./automation')

const baseClub = { id: 'club_1', orgId: 'org_1', userId: 'user_1', telegramChatId: null }

describe('resolveInitialStatus', () => {
  it('returns DRAFT for a MANUAL club with no violation', async () => {
    const status = await resolveInitialStatus({ ...baseClub, automationMode: 'MANUAL' })
    expect(status).toBe('DRAFT')
  })

  it('returns DRAFT for a FULL_AUTO club with no violation', async () => {
    const status = await resolveInitialStatus({ ...baseClub, automationMode: 'FULL_AUTO' })
    expect(status).toBe('DRAFT')
  })

  it('returns PENDING_REVIEW for an AUTO_REVIEW club regardless of forceReview', async () => {
    const status = await resolveInitialStatus({ ...baseClub, automationMode: 'AUTO_REVIEW' })
    expect(status).toBe('PENDING_REVIEW')
  })

  // Régression : un mot interdit détecté doit forcer PENDING_REVIEW même pour un
  // club FULL_AUTO — sinon le post reste un DRAFT ordinaire, indiscernable des
  // brouillons habituels, alors que runAutomationSideEffects le traite déjà
  // comme nécessitant une relecture (cf. lib/bannedWords.ts).
  it('forces PENDING_REVIEW for a FULL_AUTO club when a banned word is detected', async () => {
    const status = await resolveInitialStatus({ ...baseClub, automationMode: 'FULL_AUTO' }, { forceReview: true })
    expect(status).toBe('PENDING_REVIEW')
  })

  it('forces PENDING_REVIEW for a MANUAL club when a banned word is detected', async () => {
    const status = await resolveInitialStatus({ ...baseClub, automationMode: 'MANUAL' }, { forceReview: true })
    expect(status).toBe('PENDING_REVIEW')
  })
})
