import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { publishToFacebook, publishToInstagram, classifyMetaError } from '@/lib/social/meta'
import { decryptSecret } from '@/lib/social/token-crypto'
import { clubOwnershipOr } from '@/lib/postTypes'
import { notifyReconnectNeeded } from '@/lib/services/telegram-notify'

export type PublishResult = {
  id: string
  provider: string
  accountName: string
  ok: boolean
  error?: string
  postId?: string
}

type PublishableConnection = {
  id: string
  provider: string
  accountName: string
  providerAccountId: string
  accessToken: string
  invalid?: boolean
}

/** Nombre maximal de tentatives (initiale incluse) avant abandon définitif — cf. cron publish-retry. */
export const MAX_PUBLISH_RETRIES = 3

/** Durée au-delà de laquelle un post resté en PUBLISHING est considéré bloqué (cf. admin/alerts et cron publish-retry). */
export const STUCK_PUBLISHING_MINUTES = 15

/**
 * Publie séquentiellement sur chaque connexion réseau. Les connexions déjà
 * marquées `invalid` (précédente erreur d'authentification Meta) sont
 * ignorées sans appel API — elles nécessitent une reconnexion. Une connexion
 * qui échoue avec une erreur d'authentification pendant cet appel est marquée
 * `invalid` en base et le club est notifié une seule fois (transition
 * false → true), pour éviter de retenter en pure perte jusqu'à reconnexion.
 */
export async function publishToSocialConnections(
  club: { id: string; telegramChatId: string | null },
  connections: PublishableConnection[],
  text: string,
  imageUrl?: string
): Promise<PublishResult[]> {
  const results: PublishResult[] = []
  for (const c of connections) {
    if (c.invalid) {
      results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: false, error: 'Connexion invalide — reconnexion Facebook/Instagram requise.' })
      continue
    }
    try {
      const token = decryptSecret(c.accessToken)
      if (c.provider === 'instagram') {
        if (!imageUrl) throw new Error('Instagram nécessite un visuel.')
        const postId = await publishToInstagram(c.providerAccountId, token, text, imageUrl)
        results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: true, postId })
      } else {
        const postId = await publishToFacebook(c.providerAccountId, token, text, imageUrl)
        results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: true, postId })
      }
    } catch (err) {
      const message = (err as Error).message
      results.push({ id: c.id, provider: c.provider, accountName: c.accountName, ok: false, error: message })

      if (classifyMetaError(err) === 'auth') {
        const updated = await prisma.socialConnection.updateMany({ where: { id: c.id, invalid: false }, data: { invalid: true } })
        if (updated.count === 1) {
          await notifyReconnectNeeded(club, c.provider, `La connexion "${c.accountName}" a été refusée par ${c.provider === 'instagram' ? 'Instagram' : 'Facebook'} (token invalide ou révoqué).`)
        }
      }
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
  const firstError = results.find(r => !r.ok)?.error ?? null
  await prisma.generatedPost.update({
    where: { id: generatedPostId },
    data: {
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
      publishResults: results as unknown as Prisma.InputJsonValue,
      lastError: firstError,
      retryCount: { increment: 1 },
    },
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

/** Statuts à partir desquels une publication peut être déclenchée pour la première fois. */
const PUBLISHABLE_STATUSES = ['DRAFT', 'PENDING_REVIEW']

/** Statuts à partir desquels une republication (retry) peut être tentée. */
const RETRYABLE_STATUSES = ['FAILED', 'PARTIAL']

/**
 * Réserve atomiquement un GeneratedPost pour publication : ne transitionne
 * DRAFT/PENDING_REVIEW → PUBLISHING que si aucune autre requête ne l'a déjà
 * fait. Empêche la double publication sur un rejeu de webhook Telegram ou un
 * double-clic (deux appels concurrents ne peuvent pas obtenir count === 1).
 */
export async function claimPostForPublishing(generatedPostId: string): Promise<boolean> {
  const claim = await prisma.generatedPost.updateMany({
    where: { id: generatedPostId, status: { in: PUBLISHABLE_STATUSES } },
    data: { status: 'PUBLISHING' },
  })
  return claim.count === 1
}

/**
 * Variante retry de claimPostForPublishing : ne réserve qu'un post déjà
 * FAILED/PARTIAL (résultat d'une tentative précédente), utilisée uniquement
 * par le cron publish-retry. Même garantie d'unicité atomique.
 */
export async function claimPostForRetry(generatedPostId: string): Promise<boolean> {
  const claim = await prisma.generatedPost.updateMany({
    where: { id: generatedPostId, status: { in: RETRYABLE_STATUSES } },
    data: { status: 'PUBLISHING' },
  })
  return claim.count === 1
}

/**
 * Point d'entrée unique pour publier un post déjà généré, sans passage par un
 * FormData/UI (utilisé par le mode FULL_AUTO, le callback "Publier" Telegram,
 * et le cron publish-retry via options.isRetry). Utilise le visuel déjà
 * stocké sur GeneratedPost.imageUrl (pas de nouvel upload). Publie sur toutes
 * les connexions du club dont le provider correspond à la plateforme du post ;
 * ignore les posts WhatsApp (pas d'API de publication).
 *
 * En retry, ne retente que les connexions n'ayant pas réussi lors du dernier
 * essai (post.publishResults) — évite de republier sur un réseau déjà OK en
 * cas de statut PARTIAL.
 */
export async function publishGeneratedPost(params: { clubId: string; generatedPostId: string; isRetry?: boolean }) {
  const { clubId, generatedPostId, isRetry = false } = params
  const post = await findClubGeneratedPost(clubId, generatedPostId)
  if (!post) return { ok: false, skipped: true, reason: 'Post introuvable', results: [] as PublishResult[] }

  if (post.platform !== 'facebook' && post.platform !== 'instagram') {
    return { ok: false, skipped: true, reason: `Plateforme "${post.platform}" non publiable via API`, results: [] as PublishResult[] }
  }

  const claimed = isRetry ? await claimPostForRetry(post.id) : await claimPostForPublishing(post.id)
  if (!claimed) {
    return { ok: false, skipped: true, reason: 'Publication déjà en cours ou déjà traitée', results: [] as PublishResult[] }
  }

  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, telegramChatId: true } })
  if (!club) {
    await prisma.generatedPost.update({ where: { id: post.id }, data: { status: 'FAILED', lastError: 'Club introuvable' } })
    return { ok: false, skipped: false, reason: 'Club introuvable', results: [] as PublishResult[] }
  }

  const previousResults = (post.publishResults as unknown as PublishResult[] | null) ?? []
  const previouslyOk = previousResults.filter(r => r.ok)
  const previouslyOkIds = new Set(previouslyOk.map(r => r.id))

  const connections = await prisma.socialConnection.findMany({
    where: { clubId, provider: post.platform, id: previouslyOkIds.size > 0 ? { notIn: [...previouslyOkIds] } : undefined },
  })
  if (connections.length === 0 && previouslyOk.length === 0) {
    await prisma.generatedPost.update({ where: { id: post.id }, data: { status: 'FAILED', lastError: 'Aucun réseau connecté pour cette plateforme' } })
    return { ok: false, skipped: false, reason: 'Aucun réseau connecté pour cette plateforme', results: [] as PublishResult[] }
  }

  const newResults = connections.length > 0
    ? await publishToSocialConnections(club, connections, post.content, post.imageUrl ?? undefined)
    : []
  const results = [...previouslyOk, ...newResults]
  const status = await recordPublishResult(post.id, results)
  return { ok: status === 'PUBLISHED', skipped: false, results }
}
