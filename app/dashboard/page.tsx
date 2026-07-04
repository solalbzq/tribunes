import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  // Sérialise les dates en string pour le passage server→client
  const serialized = club ? {
    ...club,
    matches: club.matches.map(m => ({
      ...m,
      date: m.date.toISOString(),
    })),
  } : null

  return <DashboardClient club={serialized} userEmail={user.email ?? ''} />
}
