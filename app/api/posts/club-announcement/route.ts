import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { clubAnnouncementPromptAll, type ClubAnnouncementCategory } from '@/lib/prompts/club-announcement'
import { generatePlatformPosts, toPostIds, deletePostsForRegenerate } from '@/lib/services/postGeneration'
import { runAutomationSideEffects } from '@/lib/automation'
import { validateOneTimeInstructions, resolvePersonalization } from '@/lib/personalization'
import { getPersonalizationOverride } from '@/lib/services/personalizationOverride'

const PLATFORMS = ['instagram', 'facebook'] as const
type Platform = typeof PLATFORMS[number]
const CATEGORIES: ClubAnnouncementCategory[] = ['RECRUITMENT', 'SPONSOR', 'CLUB_LIFE', 'VOLUNTEER', 'THANKS']

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const {
    category,
    title,
    description,
    ctaText,
    platforms = PLATFORMS,
    tone,
    customInstructions,
    id: existingId,
    regenerate = false,
  } = await req.json()

  if (!title || !description || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Catégorie, titre et description requis' }, { status: 400 })
  }

  const oneTimeInstructions = validateOneTimeInstructions(customInstructions)
  if (!oneTimeInstructions.ok) return NextResponse.json({ error: oneTimeInstructions.error }, { status: 400 })

  const typeOverride = await getPersonalizationOverride(club.id, 'CLUB_ANNOUNCEMENT')
  const { voice, prefix } = resolvePersonalization({
    club, postType: 'CLUB_ANNOUNCEMENT', typeOverride,
    requestOverride: { voiceOverride: tone, oneTimeInstructions: oneTimeInstructions.value },
  })
  const prompt = prefix
    + clubAnnouncementPromptAll(club.sport, club.name, category, title, description, ctaText || undefined, voice)

  const gen = await generatePlatformPosts({ club, platforms: platforms as Platform[], prompt, route: 'posts/club-announcement' })
  if (!gen.ok) return gen.response

  let announcement
  if (existingId && regenerate) {
    const existing = await prisma.clubAnnouncement.findUnique({ where: { id: existingId, clubId: club.id } })
    if (!existing) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })
    await deletePostsForRegenerate('CLUB_ANNOUNCEMENT', existingId)
    announcement = await prisma.clubAnnouncement.update({
      where: { id: existingId },
      data: {
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'CLUB_ANNOUNCEMENT',
            status: gen.initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  } else {
    announcement = await prisma.clubAnnouncement.create({
      data: {
        clubId: club.id,
        category,
        title,
        description,
        ctaText: ctaText || null,
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'CLUB_ANNOUNCEMENT',
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
