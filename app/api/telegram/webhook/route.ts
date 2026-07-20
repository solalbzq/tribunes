import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMessage, answerCallbackQuery, clearReplyMarkup } from '@/lib/telegram'
import { publishGeneratedPost } from '@/lib/services/publish-service'

type TelegramUpdate = {
  message?: {
    text?: string
    chat: { id: number }
  }
  callback_query?: {
    id: string
    data?: string
    message?: { message_id: number; chat: { id: number } }
  }
}

async function findClubForPost(postId: string) {
  const post = await prisma.generatedPost.findUnique({
    where: { id: postId },
    include: {
      match: { select: { clubId: true } },
      tournamentSchedule: { select: { clubId: true } },
      weeklySchedule: { select: { clubId: true } },
    },
  })
  if (!post) return null
  const clubId = post.match?.clubId ?? post.tournamentSchedule?.clubId ?? post.weeklySchedule?.clubId
  if (!clubId) return null
  const club = await prisma.club.findUnique({ where: { id: clubId } })
  return club ? { club, post } : null
}

async function handleStart(chatId: number, text: string) {
  const code = text.replace('/start', '').trim()
  if (!code) return

  const club = await prisma.club.findUnique({ where: { telegramLinkCode: code } })
  if (!club) {
    await sendMessage(String(chatId), "Code invalide ou déjà utilisé. Régénère un lien depuis Tribunes.")
    return
  }

  await prisma.club.update({
    where: { id: club.id },
    data: { telegramChatId: String(chatId), telegramLinkCode: null },
  })
  await sendMessage(String(chatId), `✅ Ce chat est maintenant lié à "${club.name}". Les posts à valider arriveront ici.`)
}

async function handleCallback(callback: NonNullable<TelegramUpdate['callback_query']>) {
  const { id: callbackQueryId, data, message } = callback
  if (!data || !message) return

  const [action, postId] = data.split(':')
  if ((action !== 'pub' && action !== 'rej') || !postId) {
    await answerCallbackQuery(callbackQueryId)
    return
  }

  const found = await findClubForPost(postId)
  const chatId = String(message.chat.id)
  if (!found || found.club.telegramChatId !== chatId) {
    await answerCallbackQuery(callbackQueryId, 'Action non autorisée')
    return
  }

  if (action === 'pub') {
    const result = await publishGeneratedPost({ clubId: found.club.id, generatedPostId: postId })
    await clearReplyMarkup(chatId, message.message_id)
    await answerCallbackQuery(callbackQueryId, result.ok ? 'Publié ✅' : (result.reason ?? 'Échec de publication'))
  } else {
    await prisma.generatedPost.update({ where: { id: postId }, data: { status: 'REJECTED' } })
    await clearReplyMarkup(chatId, message.message_id)
    await answerCallbackQuery(callbackQueryId, 'Rejeté')
  }
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null
  if (!update) return NextResponse.json({ ok: true })

  if (update.message?.text?.startsWith('/start')) {
    await handleStart(update.message.chat.id, update.message.text)
  } else if (update.callback_query) {
    await handleCallback(update.callback_query)
  }

  return NextResponse.json({ ok: true })
}
