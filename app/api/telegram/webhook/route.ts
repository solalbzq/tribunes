import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendMessage, answerCallbackQuery, clearReplyMarkup } from '@/lib/telegram'
import { publishGeneratedPost } from '@/lib/services/publish-service'
import { relationClubIdInclude, findRelationValue } from '@/lib/postTypes'

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
    include: relationClubIdInclude() as Prisma.GeneratedPostInclude,
  })
  if (!post) return null
  const clubId = findRelationValue<string>(post as unknown as Record<string, { clubId?: string } | null>, 'clubId')
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

  try {
    await prisma.club.update({
      where: { id: club.id },
      data: { telegramChatId: String(chatId), telegramLinkCode: null },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await sendMessage(String(chatId), "Ce chat Telegram est déjà lié à un autre club Tribunes. Déconnecte-le d'abord depuis ce club avant de le relier ailleurs.")
      return
    }
    throw err
  }
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
    await prisma.generatedPost.updateMany({
      where: { id: postId, status: { in: ['DRAFT', 'PENDING_REVIEW'] } },
      data: { status: 'REJECTED' },
    })
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
