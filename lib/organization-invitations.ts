import { createHash, randomBytes } from 'crypto'

import { prisma } from '@/lib/prisma'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function createInvitationToken() {
  return randomBytes(32).toString('hex')
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function acceptOrganizationInvitation(token: string, user: { id: string; email?: string | null }) {
  const email = user.email?.trim().toLowerCase()
  if (!email) {
    return { ok: false as const, error: 'Adresse email introuvable sur votre compte.' }
  }

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
  })

  if (!invitation || invitation.expiresAt < new Date()) {
    return { ok: false as const, error: 'Invitation invalide ou expiree.' }
  }

  if (invitation.email.toLowerCase() !== email) {
    return { ok: false as const, error: 'Connectez-vous avec l’adresse email invitee pour accepter cette invitation.' }
  }

  await prisma.organizationMember.upsert({
    where: { orgId_userId: { orgId: invitation.orgId, userId: user.id } },
    update: { role: invitation.role },
    create: { orgId: invitation.orgId, userId: user.id, role: invitation.role },
  })

  if (!invitation.acceptedAt) {
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    })
  }

  return { ok: true as const, orgId: invitation.orgId }
}

export function getInvitationExpiryDate() {
  return new Date(Date.now() + INVITATION_TTL_MS)
}
