import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  // 30 derniers jours
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const matches = await prisma.matchResult.findMany({
    where: {
      clubId: club.id,
      matchType: 'INTERCLUB',
      date: { gte: since },
    },
    include: { posts: { select: { id: true } } },
    orderBy: { date: 'desc' },
    take: 20,
  })

  return NextResponse.json(
    matches.map(m => ({
      id: m.id,
      date: m.date.toISOString(),
      opponent: m.opponent,
      globalScore: m.globalScore ?? `${m.homeScore}-${m.awayScore}`,
      teamName: m.teamName,
      division: m.division,
      hasPosts: m.posts.length > 0,
    }))
  )
}
