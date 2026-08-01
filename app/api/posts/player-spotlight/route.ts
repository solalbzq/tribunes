import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { playerSpotlightPromptAll } from '@/lib/prompts/player-spotlight'
import { generatePlatformPosts, toPostIds, deletePostsForRegenerate } from '@/lib/services/postGeneration'
import { runAutomationSideEffects } from '@/lib/automation'
import { validateOneTimeInstructions, resolvePersonalization } from '@/lib/personalization'
import { getPersonalizationOverride } from '@/lib/services/personalizationOverride'

const PLATFORMS = ['instagram', 'facebook', 'whatsapp'] as const
type Platform = typeof PLATFORMS[number]

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const {
    playerName,
    achievement,
    periodLabel,
    platforms = PLATFORMS,
    tone,
    customInstructions,
    id: existingId,
    regenerate = false,
  } = await req.json()

  if (!playerName || !achievement) {
    return NextResponse.json({ error: 'Joueur et performance requis' }, { status: 400 })
  }

  const oneTimeInstructions = validateOneTimeInstructions(customInstructions)
  if (!oneTimeInstructions.ok) return NextResponse.json({ error: oneTimeInstructions.error }, { status: 400 })

  const typeOverride = await getPersonalizationOverride(club.id, 'PLAYER_SPOTLIGHT')
  const { voice, prefix } = resolvePersonalization({
    club, postType: 'PLAYER_SPOTLIGHT', typeOverride,
    requestOverride: { voiceOverride: tone, oneTimeInstructions: oneTimeInstructions.value },
  })
  const prompt = prefix
    + playerSpotlightPromptAll(club.sport, club.name, playerName, achievement, periodLabel || undefined, voice)

  const gen = await generatePlatformPosts({ club, platforms: platforms as Platform[], prompt, route: 'posts/player-spotlight' })
  if (!gen.ok) return gen.response

  let spotlight
  if (existingId && regenerate) {
    const existing = await prisma.playerSpotlight.findUnique({ where: { id: existingId, clubId: club.id } })
    if (!existing) return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    await deletePostsForRegenerate('PLAYER_SPOTLIGHT', existingId)
    spotlight = await prisma.playerSpotlight.update({
      where: { id: existingId },
      data: {
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'PLAYER_SPOTLIGHT',
            status: gen.initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  } else {
    spotlight = await prisma.playerSpotlight.create({
      data: {
        clubId: club.id,
        playerName,
        achievement,
        periodLabel: periodLabel || null,
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'PLAYER_SPOTLIGHT',
            status: gen.initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  }

  await runAutomationSideEffects(club, spotlight.posts, { forceReview: gen.bannedWords.hasViolation })

  return NextResponse.json({
    spotlightId: spotlight.id,
    posts: gen.postsByPlatform,
    postIds: toPostIds(spotlight.posts),
    bannedWordsWarning: gen.bannedWords.hasViolation ? gen.bannedWords.violationsByPlatform : null,
  })
}
