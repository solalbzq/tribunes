import { NextResponse } from 'next/server'
import { z } from 'zod'

import { OrganizationInvitation } from '@/emails/OrganizationInvitation'
import { getActiveOrganizationId } from '@/lib/active-organization'
import { createInvitationToken, getInvitationExpiryDate, hashInvitationToken } from '@/lib/organization-invitations'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { PLANS, normalizePlan } from '@/lib/plans'
import { getResend } from '@/lib/resend'

const inviteSchema = z.object({
  email: z.string().trim().email(),
})

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = inviteSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })

  const email = parsed.data.email.toLowerCase()

  // Get org where caller is OWNER
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: 'OWNER', orgId: getActiveOrganizationId() ?? undefined },
    include: { org: { include: { members: true } } },
  }) ?? await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: 'OWNER' },
    include: { org: { include: { members: true } } },
  })
  if (!membership) return NextResponse.json({ error: 'Not an owner' }, { status: 403 })

  const org = membership.org
  const planDef = PLANS[normalizePlan(org.plan)]
  const limit = planDef.quotas.maxMembers
  if (limit != null && org.members.length >= limit) {
    return NextResponse.json({
      error: `Votre plan ${planDef.label} est limité à ${limit} compte(s). Passez au plan Pro pour inviter des collaborateurs.`,
      upgrade: true,
    }, { status: 403 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!baseUrl || !fromEmail) {
    return NextResponse.json({ error: 'Configuration email incomplète.' }, { status: 500 })
  }

  if (user.email?.toLowerCase() === email) {
    return NextResponse.json({ error: 'Vous faites deja partie de cette structure.' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient()
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const invited = users.find(u => u.email?.toLowerCase() === email)

  if (invited) {
    const existingMember = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: invited.id } },
    })
    if (existingMember) {
      return NextResponse.json({ error: 'Cette personne fait deja partie de la structure.' }, { status: 409 })
    }
  }

  const token = createInvitationToken()
  const expiresAt = getInvitationExpiryDate()

  const pendingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      orgId: org.id,
      email,
      acceptedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  })

  const invitation = pendingInvitation
    ? await prisma.organizationInvitation.update({
        where: { id: pendingInvitation.id },
        data: {
          invitedByUserId: user.id,
          role: 'MEMBER',
          tokenHash: hashInvitationToken(token),
          expiresAt,
        },
      })
    : await prisma.organizationInvitation.create({
        data: {
          orgId: org.id,
          email,
          invitedByUserId: user.id,
          role: 'MEMBER',
          tokenHash: hashInvitationToken(token),
          expiresAt,
        },
      })

  await getResend().emails.send({
    from: fromEmail,
    to: email,
    subject: `${org.name} vous invite sur Tribunes`,
    react: OrganizationInvitation({
      acceptUrl: `${baseUrl}/api/organization/invitations/accept?token=${token}`,
      inviterEmail: user.email ?? 'Un membre de votre organisation',
      organizationName: org.name,
    }),
  })

  return NextResponse.json({ id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt })
}
