import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { matchAnnouncementPromptAll } from '@/lib/prompts/match-announcement'
import { generatePlatformPosts, toPostIds, deletePostsForRegenerate } from '@/lib/services/postGeneration'
import { runAutomationSideEffects } from '@/lib/automation'
import { buildPersonalizationPrefix, validateOneTimeInstructions } from '@/lib/personalization'

const PLATFORMS = ['instagram', 'facebook', 'whatsapp'] as const
type Platform = typeof PLATFORMS[number]

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const {
    opponent,
    matchDate: matchDateRaw,
    time,
    venue,
    competition,
    isHome = true,
    note,
    platforms = PLATFORMS,
    tone,
    customInstructions,
    id: existingId,
    regenerate = false,
  } = await req.json()

  if (!opponent || !matchDateRaw) {
    return NextResponse.json({ error: 'Adversaire et date requis' }, { status: 400 })
  }

  const oneTimeInstructions = validateOneTimeInstructions(customInstructions)
  if (!oneTimeInstructions.ok) return NextResponse.json({ error: oneTimeInstructions.error }, { status: 400 })

  const matchDate = new Date(matchDateRaw)
  const voice = tone || club.contentTone
  const prompt = buildPersonalizationPrefix(club, oneTimeInstructions.value) + matchAnnouncementPromptAll(
    club.sport, club.name, opponent, matchDate, time || undefined, venue || undefined,
    competition || undefined, Boolean(isHome), note || undefined, voice
  )

  const gen = await generatePlatformPosts({ club, platforms: platforms as Platform[], prompt, route: 'posts/match-announcement' })
  if (!gen.ok) return gen.response

  let announcement
  if (existingId && regenerate) {
    const existing = await prisma.matchAnnouncement.findUnique({ where: { id: existingId, clubId: club.id } })
    if (!existing) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })
    await deletePostsForRegenerate('MATCH_ANNOUNCEMENT', existingId)
    announcement = await prisma.matchAnnouncement.update({
      where: { id: existingId },
      data: {
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'MATCH_ANNOUNCEMENT',
            status: gen.initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  } else {
    announcement = await prisma.matchAnnouncement.create({
      data: {
        clubId: club.id,
        opponent,
        matchDate,
        time: time || null,
        venue: venue || null,
        competition: competition || null,
        isHome: Boolean(isHome),
        note: note || null,
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'MATCH_ANNOUNCEMENT',
            status: gen.initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  }

  await runAutomationSideEffects(club, announcement.posts, { forceReview: gen.bannedWords.hasViolation })

  return NextResponse.json({
    announcementId: announcement.id,
    posts: gen.postsByPlatform,
    postIds: toPostIds(announcement.posts),
    bannedWordsWarning: gen.bannedWords.hasViolation ? gen.bannedWords.violationsByPlatform : null,
  })
}
