// Résolution d'organisation : chaque utilisateur doit avoir une org (le plan
// vit dessus). Création paresseuse sur les chemins liés à la facturation ;
// les lectures de plan n'écrivent jamais rien.

import { prisma } from './prisma'
import { normalizePlan, type PlanKey } from './plans'

export async function listOrganizationsForUser(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: {
      org: {
        include: {
          members: true,
          clubs: { select: { id: true, name: true, sport: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Renvoie l'organisation de l'utilisateur, en la créant si nécessaire
 * (nom = club de l'utilisateur, sinon `fallbackName`). Lie au passage
 * tous ses clubs orphelins à l'org.
 */
export async function getOrCreateOrgForUser(userId: string, fallbackName: string, preferredOrgId?: string | null) {
  const memberships = await listOrganizationsForUser(userId)
  if (memberships.length > 0) {
    const activeMembership = (preferredOrgId
      ? memberships.find((membership) => membership.orgId === preferredOrgId)
      : null) ?? memberships[0]

    return { org: activeMembership.org, role: activeMembership.role, memberships }
  }

  const club = await prisma.club.findUnique({ where: { userId } })
  const org = await prisma.organization.create({
    data: {
      name: club?.name ?? fallbackName,
      members: { create: { userId, role: 'OWNER' } },
    },
    include: {
      members: true,
      clubs: { select: { id: true, name: true, sport: true } },
    },
  })
  await prisma.club.updateMany({ where: { userId, orgId: null }, data: { orgId: org.id } })
  return {
    org,
    role: 'OWNER',
    memberships: [
      {
        id: org.members[0].id,
        orgId: org.id,
        userId,
        role: 'OWNER',
        createdAt: org.members[0].createdAt,
        org,
      },
    ],
  }
}

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
