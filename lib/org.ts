// Résolution d'organisation : chaque utilisateur doit avoir une org (le plan
// vit dessus). Lecture seule — n'écrit jamais rien.

import { prisma } from './prisma'
import { normalizePlan, type PlanKey } from './plans'

/**
 * Plan effectif d'un club, en lecture seule : org du club, sinon org dont
 * le propriétaire du club est membre, sinon FREE.
 */
export async function resolvePlanForClub(club: {
  orgId: string | null
  userId: string
}): Promise<{ plan: PlanKey; orgId: string | null }> {
  if (club.orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: club.orgId },
      select: { plan: true },
    })
    return { plan: normalizePlan(org?.plan), orgId: club.orgId }
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: club.userId },
    include: { org: { select: { id: true, plan: true } } },
  })
  if (membership?.org) {
    return { plan: normalizePlan(membership.org.plan), orgId: membership.org.id }
  }
  return { plan: 'FREE', orgId: null }
}
