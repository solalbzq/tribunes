import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMessage, telegramConfigured } from '@/lib/telegram'

/**
 * Résumé quotidien groupé des posts en attente de validation, par club
 * (mode Auto + validation). Complète les aperçus individuels envoyés à la
 * création (lib/services/telegram-notify.ts) — utile si un club en a laissé
 * s'accumuler plusieurs sans les traiter au fil de l'eau.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!telegramConfigured()) {
    return NextResponse.json({ ok: true, skipped: 'Telegram non configuré' })
  }

  const pending = await prisma.generatedPost.findMany({
    where: {
      status: 'PENDING_REVIEW',
      OR: [
        { match: { club: { telegramChatId: { not: null } } } },
        { tournamentSchedule: { club: { telegramChatId: { not: null } } } },
        { weeklySchedule: { club: { telegramChatId: { not: null } } } },
        { seasonRecap: { club: { telegramChatId: { not: null } } } },
      ],
    },
    include: {
      match: { select: { club: { select: { id: true, name: true, telegramChatId: true } } } },
      tournamentSchedule: { select: { club: { select: { id: true, name: true, telegramChatId: true } } } },
      weeklySchedule: { select: { club: { select: { id: true, name: true, telegramChatId: true } } } },
      seasonRecap: { select: { club: { select: { id: true, name: true, telegramChatId: true } } } },
    },
  })

  const byClub = new Map<string, { name: string; chatId: string; count: number }>()
  for (const post of pending) {
    const club = post.match?.club ?? post.tournamentSchedule?.club ?? post.weeklySchedule?.club ?? post.seasonRecap?.club
    if (!club?.telegramChatId) continue
    const entry = byClub.get(club.id) ?? { name: club.name, chatId: club.telegramChatId, count: 0 }
    entry.count += 1
    byClub.set(club.id, entry)
  }

  let sent = 0
  for (const { chatId, count } of byClub.values()) {
    await sendMessage(
      chatId,
      `📋 ${count} post${count > 1 ? 's' : ''} en attente de validation. Ouvre le dashboard Tribunes pour les relire, ou utilise les boutons sous chaque aperçu déjà envoyé ici.`
    )
    sent += 1
  }

  return NextResponse.json({ ok: true, clubsNotified: sent, pendingCount: pending.length })
}
