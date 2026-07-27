import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { seasonRecapPromptAll } from '@/lib/prompts/season-recap'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'
import { checkAiQuota, quotaExceededResponse } from '@/lib/quota'
import { resolveInitialStatus, runAutomationSideEffects } from '@/lib/automation'
import { buildPersonalizationPrefix } from '@/lib/personalization'
import { deletePostsForRegenerate } from '@/lib/services/postGeneration'

const PLATFORMS = ['instagram', 'facebook', 'whatsapp'] as const
type Platform = typeof PLATFORMS[number]

/**
 * Bilan de saison/période, disponible pour tous les sports (MatchResult est
 * déjà partagé par le flux générique et le flux interclub tennis/padel).
 * Le W/D/L est calculé automatiquement depuis les matchs enregistrés sur la
 * période ; rankingNote (classement, qualification...) reste une saisie
 * manuelle, aucune source ne le fournit.
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const {
    periodStart: periodStartRaw,
    periodEnd: periodEndRaw,
    periodLabel = 'de la période',
    rankingNote,
    platforms = PLATFORMS,
    tone,
    customInstructions,
    id: existingRecapId,
    regenerate = false,
  } = await req.json()

  const now = new Date()
  const periodStart = periodStartRaw ? new Date(periodStartRaw) : new Date(now.getFullYear(), 0, 1)
  const periodEnd = periodEndRaw ? new Date(periodEndRaw) : now

  const matches = await prisma.matchResult.findMany({
    where: { clubId: club.id, date: { gte: periodStart, lte: periodEnd } },
    select: { homeScore: true, awayScore: true, isHome: true },
  })

  if (matches.length === 0) {
    return NextResponse.json({ error: 'Aucun match enregistré sur cette période' }, { status: 404 })
  }

  let wins = 0, draws = 0, losses = 0
  for (const m of matches) {
    const us = m.isHome ? m.homeScore : m.awayScore
    const them = m.isHome ? m.awayScore : m.homeScore
    if (us > them) wins++
    else if (us < them) losses++
    else draws++
  }

  const quota = await checkAiQuota(club)
  if (!quota.allowed) return quotaExceededResponse(quota)

  const voice = tone || club.contentTone
  const prompt = buildPersonalizationPrefix(club, customInstructions)
    + seasonRecapPromptAll(club.sport, club.name, periodLabel, wins, draws, losses, rankingNote || undefined, voice)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })
  await logAiUsage(club.id, completion, 'gpt-4o', { route: 'posts/season-recap' })

  const all = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const requested = platforms as Platform[]
  const posts: Record<string, string> = {}
  for (const platform of requested) posts[platform] = all[platform]

  const initialStatus = await resolveInitialStatus(club)

  let recap
  if (existingRecapId && regenerate) {
    const existing = await prisma.seasonRecap.findUnique({ where: { id: existingRecapId, clubId: club.id } })
    if (!existing) return NextResponse.json({ error: 'Bilan introuvable' }, { status: 404 })
    await deletePostsForRegenerate('SEASON_RECAP', existingRecapId)
    recap = await prisma.seasonRecap.update({
      where: { id: existingRecapId },
      data: {
        posts: {
          create: Object.entries(posts).map(([platform, content]) => ({
            platform,
            content,
            postType: 'SEASON_RECAP',
            status: initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  } else {
    recap = await prisma.seasonRecap.create({
      data: {
        clubId: club.id,
        periodStart,
        periodEnd,
        wins,
        draws,
        losses,
        rankingNote: rankingNote || null,
        posts: {
          create: Object.entries(posts).map(([platform, content]) => ({
            platform,
            content,
            postType: 'SEASON_RECAP',
            status: initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  }

  await runAutomationSideEffects(club, recap.posts)
  const postIds = Object.fromEntries(recap.posts.map(p => [p.platform, p.id]))

  return NextResponse.json({ recapId: recap.id, posts, postIds, record: { wins, draws, losses } })
}
