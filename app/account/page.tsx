import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const club = await prisma.club.findUnique({ where: { userId: user.id } })

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      org: { include: { members: true } },
    },
  })

  return (
    <AccountClient
      userEmail={user.email ?? ''}
      userId={user.id}
      club={club ? { name: club.name, sport: club.sport } : null}
      org={
        membership?.org
          ? {
              ...membership.org,
              members: membership.org.members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
            }
          : null
      }
      role={membership?.role ?? null}
    />
  )
}
