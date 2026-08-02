import { prisma } from '@/lib/prisma'
import { sendMessage, sendPhoto, telegramConfigured, type InlineButton } from '@/lib/telegram'

const MESSAGE_LIMIT = 4096
const PHOTO_CAPTION_LIMIT = 1024

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : text.slice(0, limit - 1) + '…'
}

/**
 * Envoie l'aperçu d'un post en attente de validation (mode Auto + validation)
 * sur le chat Telegram lié au club, avec boutons Publier/Rejeter. No-op si le
 * bot n'est pas configuré ou si le club n'a pas encore lié de chat.
 */
export async function notifyPendingReview(
  club: { id: string; telegramChatId: string | null },
  post: { id: string; content: string; imageUrl: string | null }
) {
  if (!telegramConfigured() || !club.telegramChatId) return

  const buttons: InlineButton[][] = [[
    { text: '✅ Publier', callback_data: `pub:${post.id}` },
    { text: '❌ Rejeter', callback_data: `rej:${post.id}` },
  ]]

  const result = post.imageUrl
    ? await sendPhoto(club.telegramChatId, post.imageUrl, truncate(post.content, PHOTO_CAPTION_LIMIT), buttons)
    : await sendMessage(club.telegramChatId, truncate(post.content, MESSAGE_LIMIT), buttons)

  await prisma.telegramMessage.create({
    data: {
      generatedPostId: post.id,
      chatId: club.telegramChatId,
      messageId: String(result.message_id),
      kind: 'preview',
    },
  })
}

const PROVIDER_LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram' }

/**
 * Prévient le club qu'une de ses connexions réseau social nécessite une
 * reconnexion (token expiré/révoqué, ou impossible à prolonger automatiquement).
 * No-op si le bot n'est pas configuré ou si le club n'a pas lié de chat —
 * l'admin reste alerté séparément via /api/admin/alerts dans tous les cas.
 */
export async function notifyReconnectNeeded(
  club: { id: string; telegramChatId: string | null },
  provider: string,
  reason: string
) {
  if (!telegramConfigured() || !club.telegramChatId) return

  const label = PROVIDER_LABEL[provider] ?? provider
  await sendMessage(
    club.telegramChatId,
    `⚠️ Connexion ${label} à renouveler\n\n${reason}\n\nRends-toi dans Tribunes (Réglages → Réseaux) pour reconnecter ton compte.`
  )
}

/**
 * Prévient le club qu'une publication a définitivement échoué après épuisement
 * des tentatives automatiques (cron publish-retry). No-op si le bot n'est pas
 * configuré ou si le club n'a pas lié de chat.
 */
export async function notifyPublishFailed(
  club: { id: string; telegramChatId: string | null },
  post: { id: string; platform: string },
  reason: string
) {
  if (!telegramConfigured() || !club.telegramChatId) return

  const label = PROVIDER_LABEL[post.platform] ?? post.platform
  await sendMessage(
    club.telegramChatId,
    `❌ Publication ${label} échouée\n\n${reason}\n\nLe post n'a pas pu être publié automatiquement après plusieurs tentatives. Vérifie-le dans Tribunes.`
  )
}
