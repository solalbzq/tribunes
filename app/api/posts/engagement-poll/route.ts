import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { engagementPollPromptAll } from '@/lib/prompts/engagement-poll'
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
    question,
    options,
    platforms = PLATFORMS,
    tone,
    customInstructions,
    id: existingId,
    regenerate = false,
  } = await req.json()

  const cleanOptions: string[] = Array.isArray(options) ? options.filter((o: unknown) => typeof o === 'string' && o.trim()).map((o: string) => o.trim()) : []

  if (!question || cleanOptions.length < 2 || cleanOptions.length > 4) {
    return NextResponse.json({ error: 'Question et 2 à 4 options requises' }, { status: 400 })
  }

  const oneTimeInstructions = validateOneTimeInstructions(customInstructions)
  if (!oneTimeInstructions.ok) return NextResponse.json({ error: oneTimeInstructions.error }, { status: 400 })

  const typeOverride = await getPersonalizationOverride(club.id, 'ENGAGEMENT_POLL')
  const { voice, prefix } = resolvePersonalization({
    club, postType: 'ENGAGEMENT_POLL', typeOverride,
    requestOverride: { voiceOverride: tone, oneTimeInstructions: oneTimeInstructions.value },
  })
  const prompt = prefix
    + engagementPollPromptAll(club.sport, club.name, question, cleanOptions, voice)

  const gen = await generatePlatformPosts({ club, platforms: platforms as Platform[], prompt, route: 'posts/engagement-poll' })
  if (!gen.ok) return gen.response

  let poll
  if (existingId && regenerate) {
    const existing = await prisma.engagementPoll.findUnique({ where: { id: existingId, clubId: club.id } })
    if (!existing) return NextResponse.json({ error: 'Sondage introuvable' }, { status: 404 })
    await deletePostsForRegenerate('ENGAGEMENT_POLL', existingId)
    poll = await prisma.engagementPoll.update({
      where: { id: existingId },
      data: {
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'ENGAGEMENT_POLL',
            status: gen.initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  } else {
    poll = await prisma.engagementPoll.create({
      data: {
        clubId: club.id,
        question,
        options: cleanOptions,
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'ENGAGEMENT_POLL',
            status: gen.initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  }

  await runAutomationSideEffects(club, poll.posts, { forceReview: gen.bannedWords.hasViolation })

  return NextResponse.json({
    pollId: poll.id,
    posts: gen.postsByPlatform,
    postIds: toPostIds(poll.posts),
    bannedWordsWarning: gen.bannedWords.hasViolation ? gen.bannedWords.violationsByPlatform : null,
  })
}
