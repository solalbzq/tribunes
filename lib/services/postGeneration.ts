import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { splitPlatformPosts, type PlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'
import { checkAiQuota, quotaExceededResponse } from '@/lib/quota'
import { resolveInitialStatus } from '@/lib/automation'
import { parentIdField } from '@/lib/postTypes'
import { checkBannedWordsAcrossPlatforms, type BannedWordsCheck } from '@/lib/bannedWords'

export type ClubForGeneration = {
  id: string
  orgId: string | null
  userId: string
  automationMode: string
  telegramChatId: string | null
  bannedWords?: string | null
}

export type GenerationOutcome =
  | { ok: true; postsByPlatform: Record<string, string>; initialStatus: 'DRAFT' | 'PENDING_REVIEW'; bannedWords: BannedWordsCheck }
  | { ok: false; response: NextResponse }

/**
 * Partie commune à toutes les routes de génération multi-plateforme :
 * quota IA -> 1 appel OpenAI -> découpage par plateforme -> statut initial
 * selon le mode d'automatisation du club. La création du modèle parent
 * (avec ses GeneratedPost imbriqués) et l'appel à runAutomationSideEffects
 * restent dans chaque route, car la forme du parent varie d'un type de post
 * à l'autre — voir app/api/posts/season-recap/route.ts comme référence.
 */
export async function generatePlatformPosts(params: {
  club: ClubForGeneration
  platforms: readonly string[]
  prompt: string
  route: string
}): Promise<GenerationOutcome> {
  const { club, platforms, prompt, route } = params

  const quota = await checkAiQuota(club)
  if (!quota.allowed) return { ok: false, response: quotaExceededResponse(quota) }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })
  await logAiUsage(club.id, completion, 'gpt-4o', { route })

  const all = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const postsByPlatform: Record<string, string> = {}
  for (const platform of platforms) postsByPlatform[platform] = all[platform as keyof PlatformPosts]

  const bannedWords = checkBannedWordsAcrossPlatforms(postsByPlatform, club.bannedWords)
  const initialStatus = await resolveInitialStatus(club, { forceReview: bannedWords.hasViolation })
  return { ok: true, postsByPlatform, initialStatus, bannedWords }
}

/** `postIds` renvoyé au frontend, à partir des GeneratedPost fraîchement créés. */
export function toPostIds(posts: Array<{ id: string; platform: string }>) {
  return Object.fromEntries(posts.map(p => [p.platform, p.id]))
}

/**
 * Régénération en place : ces deux fonctions généralisent le pattern déjà
 * utilisé par les routes tennis (tournament/generate, interclub/result) à
 * tous les types de post — via lib/postTypes.ts, qui connaît déjà la colonne
 * FK de chaque type (ex: 'seasonRecapId'), pas besoin de la répéter route par
 * route.
 */

/** Posts déjà générés pour ce parent, si `regenerate` n'est pas demandé — évite de rappeler l'IA pour rien. */
export async function findCachedPosts(postType: string, parentId: string) {
  const field = parentIdField(postType)
  return prisma.generatedPost.findMany({
    where: { [field]: parentId, postType } as Prisma.GeneratedPostWhereInput,
  })
}

/** Supprime les posts existants d'un parent avant de recréer les nouveaux (régénération). */
export async function deletePostsForRegenerate(postType: string, parentId: string) {
  const field = parentIdField(postType)
  await prisma.generatedPost.deleteMany({
    where: { [field]: parentId, postType } as Prisma.GeneratedPostWhereInput,
  })
}
