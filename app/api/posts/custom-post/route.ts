import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { customPostPromptAll, type CustomPostData } from '@/lib/prompts/custom-post'
import { generatePlatformPosts, toPostIds, deletePostsForRegenerate } from '@/lib/services/postGeneration'
import { resolveInitialStatusUnconstrained, runAutomationSideEffectsUnconstrained } from '@/lib/automation'
import { buildPersonalizationPrefix } from '@/lib/personalization'

const PLATFORMS = ['instagram', 'facebook', 'whatsapp'] as const
type Platform = typeof PLATFORMS[number]

// Bornes serveur pour un contenu par nature libre : le client (CustomPostTab)
// applique déjà des limites côté UI, mais elles ne doivent jamais être la
// seule protection contre un appel API direct avec un texte disproportionné.
const MAX_FIELD_LENGTH = 200
const MAX_KEY_INFORMATION_ITEMS = 10

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(x => x.trim()) : []
}

function nullableStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const {
    objective,
    subject,
    keyInformation,
    callToAction,
    targetAudience,
    tone,
    desiredPlatforms,
    suggestedCategory,
    customInstructions,
    id: existingId,
    regenerate = false,
  } = await req.json()

  const objectiveStr = typeof objective === 'string' ? objective.trim() : ''
  const subjectStr = typeof subject === 'string' ? subject.trim() : ''
  const platforms = Array.isArray(desiredPlatforms)
    ? desiredPlatforms.filter((p): p is Platform => (PLATFORMS as readonly string[]).includes(p))
    : []

  if (!objectiveStr || !subjectStr || platforms.length === 0) {
    return NextResponse.json({ error: 'Objectif, sujet et au moins une plateforme sont requis' }, { status: 400 })
  }

  const keyInformationArr = strArray(keyInformation)
  const callToActionStr = nullableStr(callToAction)
  const targetAudienceStr = nullableStr(targetAudience)
  const toneStr = nullableStr(tone)

  const tooLong = [objectiveStr, subjectStr, ...keyInformationArr, callToActionStr, targetAudienceStr, toneStr]
    .some(v => (v?.length ?? 0) > MAX_FIELD_LENGTH)
  if (tooLong) {
    return NextResponse.json({ error: `Chaque champ est limité à ${MAX_FIELD_LENGTH} caractères` }, { status: 400 })
  }
  if (keyInformationArr.length > MAX_KEY_INFORMATION_ITEMS) {
    return NextResponse.json({ error: `Maximum ${MAX_KEY_INFORMATION_ITEMS} informations clés` }, { status: 400 })
  }

  const data: CustomPostData = {
    objective: objectiveStr,
    subject: subjectStr,
    keyInformation: keyInformationArr,
    callToAction: callToActionStr,
    targetAudience: targetAudienceStr,
    tone: toneStr,
    desiredPlatforms: platforms,
    suggestedCategory: nullableStr(suggestedCategory),
  }

  const prompt = buildPersonalizationPrefix(club, customInstructions)
    + customPostPromptAll(club.sport, club.name, data, club.contentTone)

  const gen = await generatePlatformPosts({ club, platforms, prompt, route: 'posts/custom-post' })
  if (!gen.ok) return gen.response

  // CUSTOM_POST est un contenu libre, moins contraint qu'un type structuré :
  // le statut initial ignore volontairement gen.initialStatus (qui autoriserait
  // une publication FULL_AUTO immédiate) au profit d'une variante qui exige
  // toujours une relecture humaine, quel que soit le mode d'automatisation.
  const initialStatus = await resolveInitialStatusUnconstrained(club)

  let customPost
  if (existingId && regenerate) {
    const existing = await prisma.customPost.findUnique({ where: { id: existingId, clubId: club.id } })
    if (!existing) return NextResponse.json({ error: 'Publication introuvable' }, { status: 404 })
    await deletePostsForRegenerate('CUSTOM_POST', existingId)
    customPost = await prisma.customPost.update({
      where: { id: existingId },
      data: {
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'CUSTOM_POST',
            status: initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  } else {
    customPost = await prisma.customPost.create({
      data: {
        clubId: club.id,
        objective: data.objective,
        subject: data.subject,
        keyInformation: data.keyInformation,
        callToAction: data.callToAction,
        targetAudience: data.targetAudience,
        tone: data.tone,
        desiredPlatforms: data.desiredPlatforms,
        suggestedCategory: data.suggestedCategory,
        posts: {
          create: Object.entries(gen.postsByPlatform).map(([platform, content]) => ({
            platform,
            content,
            postType: 'CUSTOM_POST',
            status: initialStatus,
          })),
        },
      },
      include: { posts: true },
    })
  }

  await runAutomationSideEffectsUnconstrained(club, customPost.posts)

  return NextResponse.json({
    customPostId: customPost.id,
    posts: gen.postsByPlatform,
    postIds: toPostIds(customPost.posts),
  })
}
