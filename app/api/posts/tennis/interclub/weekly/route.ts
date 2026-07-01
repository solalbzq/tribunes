import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { weeklySchedulePromptAll } from '@/lib/prompts/tennis-posts'
import { padelWeeklySchedulePromptAll } from '@/lib/prompts/padel-posts'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const { weekStart: weekStartRaw, platforms = ['instagram', 'facebook', 'whatsapp'] } = await req.json()
  if (!weekStartRaw) return NextResponse.json({ error: 'weekStart manquant' }, { status: 400 })

  const weekStart = new Date(weekStartRaw)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Fetch interclub matches for the week
  const matches = await prisma.matchResult.findMany({
    where: {
      clubId: club.id,
      sport: { in: ['Tennis', 'Padel'] },
      matchType: 'INTERCLUB',
      date: { gte: weekStart, lte: weekEnd },
    },
    orderBy: { date: 'asc' },
  })

  if (matches.length === 0) {
    return NextResponse.json({ error: 'Aucun match interclubs trouvé pour cette semaine' }, { status: 404 })
  }

  const sport = club.sport === 'Padel' ? 'PADEL' : 'TENNIS'
  const isPadel = sport === 'PADEL'

  const weeklyMatches = matches.map(m => ({
    teamName: m.teamName ?? club.name,
    opponent: m.opponent,
    day: m.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    time: m.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    homeAway: (m.homeAway ?? 'DOMICILE') as 'DOMICILE' | 'EXTERIEUR',
    division: m.division ?? '',
  }))

  // Un seul appel IA pour les 3 plateformes (puis découpage).
  const prompt = isPadel
    ? padelWeeklySchedulePromptAll(club.name, weekStart, weekEnd, weeklyMatches)
    : weeklySchedulePromptAll(club.name, weekStart, weekEnd, weeklyMatches)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })
  await logAiUsage(club.id, completion, 'gpt-4o')

  const all = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const requested = platforms as Array<'instagram' | 'facebook' | 'whatsapp'>
  const posts: Record<string, string> = {}
  for (const platform of requested) posts[platform] = all[platform]

  // Save WeeklySchedule + posts
  const weekly = await prisma.weeklySchedule.create({
    data: {
      clubId: club.id,
      sport,
      weekStart,
      weekEnd,
      matches: weeklyMatches as unknown as never,
      posts: {
        create: Object.entries(posts).map(([platform, content]) => ({
          platform,
          content,
          postType: 'WEEKLY_SCHEDULE',
          status: 'DRAFT',
        })),
      },
    },
  })

  return NextResponse.json({ weeklyScheduleId: weekly.id, posts, matches: weeklyMatches })
}
