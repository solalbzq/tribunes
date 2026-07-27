import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { publishToFacebook, publishToInstagram } from '@/lib/social/meta'
import { clubOwnershipOr } from '@/lib/postTypes'

export type PublishResult = {
  id: string
  provider: string
  accountName: string
  ok: boolean
  error?: string
  postId?: string
}

/** Publie séquentiellement sur chaque connexion réseau, sans toucher à la BDD. */
export async function publishToSocialConnections(
  connections: Array<{ id: string; provider: string; accountName: string; providerAccountId: string; accessToken: string }>,
  text: string,
  imageUrl?: string
): Promise<PublishResult[]> {
  const results: PublishResult[] = []
  for (const c of connections) {
    try {
      if (c.provider === 'instagram') {
        if (!imageUrl) throw new Error('Instagram nécessite un visuel.')
        const postId = await publishToInstagram(c.providerAccountId, c.accessToken, text, imageUrl)
        results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: true, postId })
      } else {
        const postId = await publishToFacebook(c.providerAccountId, c.accessToken, text, imageUrl)
        results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: true, postId })
      }
    } catch (err) {
      results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: false, error: (err as Error).message })
    }
  }
  return results
}

/** Statut final à partir des résultats de publication, façon publish/route.ts. */
export function statusFromResults(results: PublishResult[]): 'PUBLISHED' | 'PARTIAL' | 'FAILED' {
  const allOk = results.every(r => r.ok)
  if (allOk) return 'PUBLISHED'
  return results.some(r => r.ok) ? 'PARTIAL' : 'FAILED'
}

export async function recordPublishResult(generatedPostId: string, results: PublishResult[]) {
  const status = statusFromResults(results)
  await prisma.generatedPost.update({
    where: { id: generatedPostId },
    data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : undefined },
  })
  return status
}

/** Recherche d'un GeneratedPost appartenant à un club, quel que soit son parent (match/tournoi/programme/bilan). */
export async function findClubGeneratedPost(clubId: string, generatedPostId: string) {
  return prisma.generatedPost.findFirst({
    where: {
      id: generatedPostId,
      OR: clubOwnershipOr(clubId) as Prisma.GeneratedPostWhereInput[],
    },
  })
}

/**
 * Point d'entrée unique pour publier un post déjà généré, sans passage par un
 * FormData/UI (utilisé par le mode FULL_AUTO et le callback "Publier" Telegram).
 * Utilise le visuel déjà stocké sur GeneratedPost.imageUrl (pas de nouvel upload).
 * Publie sur toutes les connexions du club dont le provider correspond à la
 * plateforme du post ; ignore les posts WhatsApp (pas d'API de publication).
 */
export async function publishGeneratedPost(params: { clubId: string; generatedPostId: string }) {
  const { clubId, generatedPostId } = params
  const post = await findClubGeneratedPost(clubId, generatedPostId)
  if (!post) return { ok: false, skipped: true, reason: 'Post introuvable', results: [] as PublishResult[] }

  if (post.platform !== 'facebook' && post.platform !== 'instagram') {
    return { ok: false, skipped: true, reason: `Plateforme "${post.platform}" non publiable via API`, results: [] as PublishResult[] }
  }

  const connections = await prisma.socialConnection.findMany({
    where: { clubId, provider: post.platform },
  })
  if (connections.length === 0) {
    await prisma.generatedPost.update({ where: { id: post.id }, data: { status: 'FAILED' } })
    return { ok: false, skipped: false, reason: 'Aucun réseau connecté pour cette plateforme', results: [] as PublishResult[] }
  }

  const results = await publishToSocialConnections(connections, post.content, post.imageUrl ?? undefined)
  const status = await recordPublishResult(post.id, results)
  return { ok: status === 'PUBLISHED', skipped: false, results }
}
