import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { tournamentSchedulePrompt } from '@/lib/prompts/tennis-posts'
import { padelTournamentSchedulePrompt } from '@/lib/prompts/padel-posts'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'

const PLATFORMS = ['instagram', 'facebook', 'whatsapp'] as const
type Platform = typeof PLATFORMS[number]

async function generateWithRetry(prompt: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1200,
      })
      return res.choices[0].message.content ?? ''
    } catch (err: unknown) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 1000 * 2 ** i))
    }
  }
  return ''
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const { scheduleId, platforms = PLATFORMS, grade = '' } = await req.json()
  if (!scheduleId) return NextResponse.json({ error: 'scheduleId manquant' }, { status: 400 })

  const schedule = await prisma.tournamentSchedule.findUnique({
    where: { id: scheduleId, clubId: club.id },
  })
  if (!schedule) return NextResponse.json({ error: 'Programmation introuvable' }, { status: 404 })

  const parsed = schedule.parsedData as { clubMatches: TournamentMatch[] }
  const clubMatches = parsed.clubMatches ?? []

  if (clubMatches.length === 0) {
    return NextResponse.json({ error: 'Aucun match de votre club trouvé dans ce PDF' }, { status: 400 })
  }

  const posts: Record<string, string> = {}
  const isPadel = schedule.sport === 'PADEL'

  for (const platform of platforms as Platform[]) {
    const prompt = isPadel
      ? padelTournamentSchedulePrompt(platform, club.name, schedule.tournamentName, grade, schedule.matchDate, schedule.venue, clubMatches)
      : tournamentSchedulePrompt(platform, club.name, schedule.tournamentName, schedule.matchDate, schedule.venue, clubMatches)

    posts[platform] = await generateWithRetry(prompt)
  }

  // Save posts to DB
  await prisma.generatedPost.createMany({
    data: Object.entries(posts).map(([platform, content]) => ({
      tournamentScheduleId: scheduleId,
      platform,
      content,
      postType: 'TOURNAMENT_SCHEDULE',
      status: 'DRAFT',
    })),
  })

  return NextResponse.json({ posts, scheduleId })
}
