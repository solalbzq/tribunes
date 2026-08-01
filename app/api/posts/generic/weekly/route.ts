import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { weeklySchedulePromptAll, type GenericWeeklyMatch } from '@/lib/prompts/generic-posts'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'
import { checkAiQuota, quotaExceededResponse } from '@/lib/quota'
import { resolveInitialStatus, runAutomationSideEffects } from '@/lib/automation'
import { buildPersonalizationPrefix, validateOneTimeInstructions } from '@/lib/personalization'
import { deletePostsForRegenerate } from '@/lib/services/postGeneration'
import { checkBannedWordsAcrossPlatforms } from '@/lib/bannedWords'
import type { Sport } from '@prisma/client'

const SPORT_ENUM: Record<string, Sport> = {
  Football: 'FOOTBALL',
  Handball: 'HANDBALL',
  Basketball: 'BASKETBALL',
  Volleyball: 'VOLLEYBALL',
}

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
    weekStart: weekStartRaw,
    weekEnd: weekEndRaw,
    matches: matchesRaw,
    platforms = ['instagram', 'facebook', 'whatsapp'],
    tone,
    customInstructions,
    weeklyScheduleId: existingWeeklyId,
    regenerate = false,
  } = await req.json()

  if (!weekStartRaw || !Array.isArray(matchesRaw) || matchesRaw.length === 0) {
    return NextResponse.json({ error: 'weekStart et matches sont requis' }, { status: 400 })
  }
  const oneTimeInstructions = validateOneTimeInstructions(customInstructions)
  if (!oneTimeInstructions.ok) return NextResponse.json({ error: oneTimeInstructions.error }, { status: 400 })
  const voice = tone || club.contentTone

  const weekStart = new Date(weekStartRaw)
  const weekEnd = weekEndRaw ? new Date(weekEndRaw) : new Date(weekStart)
  if (!weekEndRaw) weekEnd.setDate(weekEnd.getDate() + 6)

  // Pas de source persistée d'où tirer les matchs à venir (contrairement au
  // tennis interclub) : la programmation est saisie côté client (formulaire
  // ProgrammeTab), pas de score requis puisque les matchs ne sont pas encore joués.
  const weeklyMatches: GenericWeeklyMatch[] = matchesRaw.map((m: GenericWeeklyMatch) => ({
    opponent: m.opponent,
    day: m.day,
    time: m.time,
    homeAway: m.homeAway,
    competition: m.competition,
  }))

  // Un seul appel IA pour les 3 plateformes (puis découpage).
  const prompt = buildPersonalizationPrefix(club, oneTimeInstructions.value)
    + weeklySchedulePromptAll(club.sport, club.name, weekStart, weekEnd, weeklyMatches, voice)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })
  await logAiUsage(club.id, completion, 'gpt-4o', { route: 'posts/generic/weekly' })

  const all = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const requested = platforms as Array<'instagram' | 'facebook' | 'whatsapp'>
  const posts: Record<string, string> = {}
  for (const platform of requested) posts[platform] = all[platform]

  const initialStatus = await resolveInitialStatus(club)
  const bannedWords = checkBannedWordsAcrossPlatforms(posts, club.bannedWords)

  let weekly
  if (existingWeeklyId && regenerate) {
    const existing = await prisma.weeklySchedule.findUnique({ where: { id: existingWeeklyId, clubId: club.id } })
    if (!existing) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
    await deletePostsForRegenerate('WEEKLY_SCHEDULE', existingWeeklyId)
    weekly = await prisma.weeklySchedule.update({
      where: { id: existingWeeklyId },
      data: {
        posts: {
          create: Object.entries(posts).map(([platform, content]) => ({
            platform,
            content,
            postType: 'WEEKLY_SCHEDULE',
            status: initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  } else {
    weekly = await prisma.weeklySchedule.create({
      data: {
        clubId: club.id,
        sport: sportEnum,
        weekStart,
        weekEnd,
        matches: weeklyMatches as unknown as never,
        posts: {
          create: Object.entries(posts).map(([platform, content]) => ({
            platform,
            content,
            postType: 'WEEKLY_SCHEDULE',
            status: initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  }

  await runAutomationSideEffects(club, weekly.posts, { forceReview: bannedWords.hasViolation })

  const postIds = Object.fromEntries(weekly.posts.map(p => [p.platform, p.id]))

  return NextResponse.json({
    weeklyScheduleId: weekly.id, posts, postIds, matches: weeklyMatches,
    bannedWordsWarning: bannedWords.hasViolation ? bannedWords.violationsByPlatform : null,
  })
}
