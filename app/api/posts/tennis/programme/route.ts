import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { tournamentSchedulePromptAll } from '@/lib/prompts/tennis-posts'
import { padelTournamentSchedulePromptAll } from '@/lib/prompts/padel-posts'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'
import { checkAiQuota, quotaExceededResponse } from '@/lib/quota'
import { resolveInitialStatus, runAutomationSideEffects } from '@/lib/automation'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'
import type { Sport } from '@prisma/client'

const PLATFORMS = ['instagram', 'facebook', 'whatsapp'] as const
type Platform = typeof PLATFORMS[number]

/**
 * Légendes IA pour le programme du club (onglet Programme de TennisPadelTab),
 * qu'il vienne de la saisie manuelle ou du scrape Ten'Up — jusqu'ici cet
 * onglet ne générait qu'un visuel, sans légendes (contrairement au Programme
 * des sports collectifs). Réutilise le modèle/prompt "tournoi" car la forme
 * des données (TournamentMatch[]) est identique à celle d'un programme.
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const quota = await checkAiQuota(club)
  if (!quota.allowed) return quotaExceededResponse(quota)

  const {
    matches: matchesRaw,
    label = 'Programme du club',
    matchDate: matchDateRaw,
    platforms = PLATFORMS,
    tone,
  } = await req.json()

  if (!Array.isArray(matchesRaw) || matchesRaw.length === 0) {
    return NextResponse.json({ error: 'matches requis' }, { status: 400 })
  }

  const matchDate = matchDateRaw ? new Date(matchDateRaw) : new Date()
  const clubMatches = matchesRaw as TournamentMatch[]
  const isPadel = club.sport === 'Padel'
  const sportEnum: Sport = isPadel ? 'PADEL' : 'TENNIS'
  const voice = tone || club.contentTone

  const schedule = await prisma.tournamentSchedule.create({
    data: {
      clubId: club.id,
      sport: sportEnum,
      rawText: '',
      matchDate,
      tournamentName: label,
      venue: '',
      parsedData: { clubMatches } as unknown as never,
    },
  })

  const prompt = isPadel
    ? padelTournamentSchedulePromptAll(club.name, label, '', matchDate, '', clubMatches, voice)
    : tournamentSchedulePromptAll(club.name, label, matchDate, '', clubMatches, voice)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })
  await logAiUsage(club.id, completion, 'gpt-4o', { route: 'posts/tennis/programme' })

  const all = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const requested = platforms as Platform[]
  const posts: Record<string, string> = {}
  for (const platform of requested) posts[platform] = all[platform]

  const initialStatus = await resolveInitialStatus(club)

  const created = await prisma.$transaction(
    Object.entries(posts).map(([platform, content]) =>
      prisma.generatedPost.create({
        data: {
          tournamentScheduleId: schedule.id,
          platform,
          content,
          postType: 'WEEKLY_SCHEDULE',
          status: initialStatus,
        },
      })
    )
  )
  await runAutomationSideEffects(club, created)
  const postIds = Object.fromEntries(created.map(p => [p.platform, p.id]))

  return NextResponse.json({ scheduleId: schedule.id, posts, postIds })
}
