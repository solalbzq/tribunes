import { createClient } from '@/lib/supabase/server'
import { getActiveOrganizationId } from '@/lib/active-organization'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'
import { getOrCreateOrgForUser } from '@/lib/org'
import { checkAiQuota } from '@/lib/quota'

export default async function AccountPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const club = await prisma.club.findUnique({ where: { userId: user.id } })

  const { org, role, memberships } = await getOrCreateOrgForUser(
    user.id,
    user.email?.split('@')[0] ?? 'Mon club',
    getActiveOrganizationId(),
  )

  const usage = club ? await checkAiQuota(club) : null

  return (
    <AccountClient
      userEmail={user.email ?? ''}
      userId={user.id}
      club={club ? { name: club.name, sport: club.sport } : null}
      org={{
        ...org,
        members: org.members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
        clubs: org.clubs.map((club) => ({ ...club })),
      }}
      organizations={memberships.map((membership) => ({
        id: membership.org.id,
        name: membership.org.name,
        role: membership.role,
        plan: membership.org.plan,
        memberCount: membership.org.members.length,
      }))}
      role={role}
      usage={usage ? { used: usage.used, limit: usage.limit } : null}
    />
  )
}
