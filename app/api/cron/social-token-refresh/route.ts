import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { refreshLongLivedToken } from '@/lib/social/meta'
import { syncSocialConnectionsForClub } from '@/lib/social/connection-sync'
import { encryptSecret, decryptSecret } from '@/lib/social/token-crypto'
import { notifyReconnectNeeded } from '@/lib/services/telegram-notify'

const REFRESH_WINDOW_DAYS = 10
const URGENT_NOTIFY_DAYS = 3

/**
 * Prolonge quotidiennement les tokens utilisateur Meta arrivant à expiration
 * (fb_exchange_token, cf. lib/social/meta.ts::refreshLongLivedToken), avant
 * qu'ils ne deviennent définitivement irrécupérables sans reconnexion
 * manuelle. Re-synchronise aussi les tokens de Page/IG dérivés. Si le
 * rafraîchissement échoue (token déjà expiré, erreur Meta) et que l'échéance
 * est proche ou dépassée, le club est notifié via Telegram pour reconnecter
 * manuellement — l'admin reste alerté séparément via /api/admin/alerts.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const window = new Date(now.getTime() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const urgentBefore = new Date(now.getTime() + URGENT_NOTIFY_DAYS * 24 * 60 * 60 * 1000)

  const candidates = await prisma.club.findMany({
    where: { metaUserAccessToken: { not: null }, metaUserTokenExpiresAt: { lt: window } },
    select: { id: true, telegramChatId: true, metaUserAccessToken: true, metaUserTokenExpiresAt: true },
  })

  let refreshed = 0
  let notified = 0
  let failed = 0

  for (const club of candidates) {
    const expiresAt = club.metaUserTokenExpiresAt!
    const alreadyExpired = expiresAt <= now

    if (!alreadyExpired) {
      try {
        const currentToken = decryptSecret(club.metaUserAccessToken!)
        const { token: newToken, expiresIn } = await refreshLongLivedToken(currentToken)
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000)

        await prisma.club.update({
          where: { id: club.id },
          data: { metaUserAccessToken: encryptSecret(newToken), metaUserTokenExpiresAt: newExpiresAt },
        })
        await syncSocialConnectionsForClub(club.id, newToken, newExpiresAt)
        refreshed++
        continue
      } catch (err) {
        console.error(`[cron/social-token-refresh] échec refresh club ${club.id}:`, (err as Error).message)
        failed++
      }
    }

    if (alreadyExpired || expiresAt < urgentBefore) {
      await notifyReconnectNeeded(
        club,
        'facebook',
        alreadyExpired
          ? 'Ta connexion Facebook/Instagram a expiré et n\'a pas pu être renouvelée automatiquement.'
          : 'Ta connexion Facebook/Instagram va expirer sous peu et n\'a pas pu être renouvelée automatiquement.'
      )
      notified++
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, refreshed, notified, failed })
}
