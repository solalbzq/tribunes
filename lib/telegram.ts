const TELEGRAM_API = 'https://api.telegram.org'

export type InlineButton = { text: string; callback_data?: string; url?: string }

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN)
}

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN manquant')
  return token
}

async function callTelegram<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram ${method} a échoué : ${data.description ?? res.status}`)
  return data.result as T
}

export async function sendMessage(chatId: string, text: string, buttons?: InlineButton[][]) {
  return callTelegram<{ message_id: number }>('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  })
}

export async function sendPhoto(chatId: string, photoUrl: string, caption: string, buttons?: InlineButton[][]) {
  return callTelegram<{ message_id: number }>('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  })
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return callTelegram('answerCallbackQuery', { callback_query_id: callbackQueryId, text })
}

/** Efface les boutons d'un message déjà envoyé (après validation/rejet). */
export async function clearReplyMarkup(chatId: string, messageId: number | string) {
  return callTelegram('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  })
}
