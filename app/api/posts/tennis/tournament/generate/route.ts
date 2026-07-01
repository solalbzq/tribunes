import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { tournamentSchedulePromptAll } from '@/lib/prompts/tennis-posts'
import { padelTournamentSchedulePromptAll } from '@/lib/prompts/padel-posts'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'
import type { ChatCompletion } from 'openai/resources/chat/completions'

const PLATFORMS = ['instagram', 'facebook', 'whatsapp'] as const
type Platform = typeof PLATFORMS[number]

async function completeWithRetry(prompt: string, retries = 3): Promise<ChatCompletion> {
  for (let i = 0; i < retries; i++) {
    try {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      })
    } catch (err: unknown) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 1000 * 2 ** i))
    }
  }
  throw new Error('Échec génération')
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const { scheduleId, platforms = PLATFORMS, grade = '', regenerate = false } = await req.json()
  if (!scheduleId) return NextResponse.json({ error: 'scheduleId manquant' }, { status: 400 })

  const schedule = await prisma.tournamentSchedule.findUnique({
    where: { id: scheduleId, clubId: club.id },
  })
  if (!schedule) return NextResponse.json({ error: 'Programmation introuvable' }, { status: 404 })

  // Réutilisation des posts déjà générés pour cette programmation.
  if (!regenerate) {
    const existing = await prisma.generatedPost.findMany({
      where: { tournamentScheduleId: scheduleId, postType: 'TOURNAMENT_SCHEDULE' },
    })
    if (existing.length > 0) {
      const posts = Object.fromEntries(existing.map(p => [p.platform, p.content]))
      return NextResponse.json({ posts, scheduleId, cached: true })
    }
  }

  const parsed = schedule.parsedData as { clubMatches: TournamentMatch[] }
  const clubMatches = parsed.clubMatches ?? []

  if (clubMatches.length === 0) {
    return NextResponse.json({ error: 'Aucun match de votre club trouvé dans ce PDF' }, { status: 400 })
  }

  const isPadel = schedule.sport === 'PADEL'

  // Un seul appel IA pour les 3 plateformes.
  const prompt = isPadel
    ? padelTournamentSchedulePromptAll(club.name, schedule.tournamentName, grade, schedule.matchDate, schedule.venue, clubMatches)
    : tournamentSchedulePromptAll(club.name, schedule.tournamentName, schedule.matchDate, schedule.venue, clubMatches)

  const completion = await completeWithRetry(prompt)
  await logAiUsage(club.id, completion, 'gpt-4o', { route: 'tournament/generate' })

  const all = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const requested = platforms as Platform[]
  const posts: Record<string, string> = {}
  for (const platform of requested) posts[platform] = all[platform]

  // Remplace les anciens posts de cette programmation.
  await prisma.generatedPost.deleteMany({ where: { tournamentScheduleId: scheduleId, postType: 'TOURNAMENT_SCHEDULE' } })
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
