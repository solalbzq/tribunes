import { createClient } from '@/lib/supabase/server'
import { getActiveOrganizationId } from '@/lib/active-organization'
import { getOrCreateOrgForUser } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { resolvePlanForClub } from '@/lib/org'
import { PLANS } from '@/lib/plans'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { org, role, memberships } = await getOrCreateOrgForUser(
    user.id,
    user.email?.split('@')[0] ?? 'Mon club',
    getActiveOrganizationId(),
  )

  const club = await prisma.club.findUnique({
    where: { userId: user.id },
    include: {
      matches: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { posts: true },
      },
    },
  })

  const planInfo = club ? await resolvePlanForClub(club) : null

  // Sérialise les dates en string pour le passage server→client
  const serialized = club ? {
    ...club,
    // Filigrane Tribunes sur les visuels des plans avec watermark (Découverte)
    watermark: PLANS[planInfo!.plan].quotas.watermark,
    matches: club.matches.map(m => ({
      ...m,
      date: m.date.toISOString(),
    })),
  } : null

  return (
    <DashboardClient
      club={serialized}
      userEmail={user.email ?? ''}
      activeOrganization={{
        id: org.id,
        name: org.name,
        plan: org.plan,
        role,
        memberCount: org.members.length,
        clubCount: org.clubs.length,
      }}
      organizations={memberships.map((membership) => ({
        id: membership.org.id,
        name: membership.org.name,
        plan: membership.org.plan,
        role: membership.role,
        memberCount: membership.org.members.length,
        clubCount: membership.org.clubs.length,
      }))}
    />
  )
}
