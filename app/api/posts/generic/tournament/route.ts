import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { tournamentSchedulePromptAll, type GenericTournamentMatch } from '@/lib/prompts/generic-posts'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'
import { checkAiQuota, quotaExceededResponse } from '@/lib/quota'
import { resolveInitialStatus, runAutomationSideEffects } from '@/lib/automation'
import { validateOneTimeInstructions, resolvePersonalization } from '@/lib/personalization'
import { getPersonalizationOverride } from '@/lib/services/personalizationOverride'
import { deletePostsForRegenerate } from '@/lib/services/postGeneration'
import { checkBannedWordsAcrossPlatforms } from '@/lib/bannedWords'
import type { Sport } from '@prisma/client'

const SPORT_ENUM: Record<string, Sport> = {
  Football: 'FOOTBALL',
  Handball: 'HANDBALL',
  Basketball: 'BASKETBALL',
  Volleyball: 'VOLLEYBALL',
}

const PLATFORMS = ['instagram', 'facebook'] as const
type Platform = typeof PLATFORMS[number]

/**
 * Contrairement au flux tennis (parsing PDF FFT + scraping Ten'Up), il n'existe
 * aucune source fédérale exploitable pour ces sports : la programmation est
 * saisie manuellement (matches passé en body), pas de sous-route "parse".
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const sportEnum = SPORT_ENUM[club.sport]
  if (!sportEnum) {
    return NextResponse.json({ error: `Sport "${club.sport}" non supporté par ce flux` }, { status: 400 })
  }

  const quota = await checkAiQuota(club)
  if (!quota.allowed) return quotaExceededResponse(quota)

  const {
    tournamentName,
    matchDate: matchDateRaw,
    venue = '',
    matches: matchesRaw,
    platforms = PLATFORMS,
    tone,
    customInstructions,
    scheduleId: existingScheduleId,
    regenerate = false,
  } = await req.json()

  if (!tournamentName || !matchDateRaw || !Array.isArray(matchesRaw) || matchesRaw.length === 0) {
    return NextResponse.json({ error: 'tournamentName, matchDate et matches sont requis' }, { status: 400 })
  }
  const oneTimeInstructions = validateOneTimeInstructions(customInstructions)
  if (!oneTimeInstructions.ok) return NextResponse.json({ error: oneTimeInstructions.error }, { status: 400 })
  const typeOverride = await getPersonalizationOverride(club.id, 'TOURNAMENT_SCHEDULE')
  const { voice, prefix } = resolvePersonalization({
    club, postType: 'TOURNAMENT_SCHEDULE', typeOverride,
    requestOverride: { voiceOverride: tone, oneTimeInstructions: oneTimeInstructions.value },
  })

  const matchDate = new Date(matchDateRaw)
  const clubMatches: GenericTournamentMatch[] = matchesRaw.map((m: GenericTournamentMatch) => ({
    opponent: m.opponent,
    time: m.time,
    category: m.category,
    round: m.round,
  }))

  let schedule
  if (existingScheduleId && regenerate) {
    schedule = await prisma.tournamentSchedule.findUnique({ where: { id: existingScheduleId, clubId: club.id } })
    if (!schedule) return NextResponse.json({ error: 'Programmation introuvable' }, { status: 404 })
    await deletePostsForRegenerate('TOURNAMENT_SCHEDULE', existingScheduleId)
  } else {
    schedule = await prisma.tournamentSchedule.create({
      data: {
        clubId: club.id,
        sport: sportEnum,
        rawText: '',
        matchDate,
        tournamentName,
        venue,
        parsedData: { clubMatches } as unknown as never,
      },
    })
  }

  const prompt = prefix
    + tournamentSchedulePromptAll(club.sport, club.name, tournamentName, matchDate, venue, clubMatches, voice)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })
  await logAiUsage(club.id, completion, 'gpt-4o', { route: 'posts/generic/tournament' })

  const all = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const requested = platforms as Platform[]
  const posts: Record<string, string> = {}
  for (const platform of requested) posts[platform] = all[platform]

  const bannedWords = checkBannedWordsAcrossPlatforms(posts, club.bannedWords)
  const initialStatus = await resolveInitialStatus(club, { forceReview: bannedWords.hasViolation })

  const created = await prisma.$transaction(
    Object.entries(posts).map(([platform, content]) =>
      prisma.generatedPost.create({
        data: {
          tournamentScheduleId: schedule.id,
          platform,
          content,
          postType: 'TOURNAMENT_SCHEDULE',
          status: initialStatus,
        },
      })
    )
  )
  await runAutomationSideEffects(club, created, { forceReview: bannedWords.hasViolation })
  const postIds = Object.fromEntries(created.map(p => [p.platform, p.id]))

  return NextResponse.json({
    scheduleId: schedule.id, posts, postIds,
    bannedWordsWarning: bannedWords.hasViolation ? bannedWords.violationsByPlatform : null,
  })
}
