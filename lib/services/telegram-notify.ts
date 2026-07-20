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
