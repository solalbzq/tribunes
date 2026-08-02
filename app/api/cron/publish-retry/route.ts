import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { relationClubIdInclude, findRelationValue } from '@/lib/postTypes'
import { publishGeneratedPost, MAX_PUBLISH_RETRIES, STUCK_PUBLISHING_MINUTES } from '@/lib/services/publish-service'
import { notifyPublishFailed } from '@/lib/services/telegram-notify'

// Cron quotidien (cf. vercel.json — le plan Vercel actuel ne permet pas une
// cadence plus fréquente que journalière). Avec MAX_PUBLISH_RETRIES tentatives
// espacées d'~1 jour, une fenêtre de 24h serait trop courte pour couvrir la
// dernière tentative selon l'heure de création du post ; 96h laisse une marge
// confortable tout en restant très en-deçà de la rétention de cleanup-posts (30j).
const RETRY_WINDOW_HOURS = 96

/**
 * 1) Récupère les GeneratedPost restés bloqués en PUBLISHING au-delà du délai
 *    normal (crash serveur probable pendant l'appel Graph API) : repasse en
 *    FAILED avec retryCount au maximum, pour empêcher tout retry automatique
 *    (risque de double-publication si l'appel a en réalité réussi côté Meta
 *    avant le crash — vérification manuelle requise, cf. /api/admin/alerts).
 * 2) Retente les publications FAILED/PARTIAL récentes (facebook/instagram,
 *    moins de MAX_PUBLISH_RETRIES tentatives, créées dans la fenêtre de retry).
 *    Notifie le club quand le nombre maximal de tentatives est atteint sans
 *    succès complet.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const stuckBefore = new Date(now.getTime() - STUCK_PUBLISHING_MINUTES * 60 * 1000)
  const retryWindowStart = new Date(now.getTime() - RETRY_WINDOW_HOURS * 60 * 60 * 1000)

  const recovered = await prisma.generatedPost.updateMany({
    where: { status: 'PUBLISHING', createdAt: { lt: stuckBefore } },
    data: {
      status: 'FAILED',
      retryCount: MAX_PUBLISH_RETRIES,
      lastError: 'Publication interrompue (crash serveur probable) — vérifier manuellement si le post existe déjà sur le réseau avant toute republication.',
    },
  })

  const candidates = await prisma.generatedPost.findMany({
    where: {
      status: { in: ['FAILED', 'PARTIAL'] },
      platform: { in: ['facebook', 'instagram'] },
      retryCount: { lt: MAX_PUBLISH_RETRIES },
      createdAt: { gte: retryWindowStart },
    },
    select: { id: true, platform: true, retryCount: true, ...relationClubIdInclude() },
  })

  let retried = 0
  let exhausted = 0

  for (const candidate of candidates) {
    const clubId = findRelationValue<string>(candidate as unknown as Record<string, { clubId?: string } | null>, 'clubId')
    if (!clubId) continue

    const result = await publishGeneratedPost({ clubId, generatedPostId: candidate.id, isRetry: true })
    if (result.skipped) continue
    retried++

    if (!result.ok && candidate.retryCount + 1 >= MAX_PUBLISH_RETRIES) {
      const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, telegramChatId: true } })
      if (club) {
        await notifyPublishFailed(
          club,
          { id: candidate.id, platform: candidate.platform },
          'La publication automatique a échoué après plusieurs tentatives.'
        )
        exhausted++
      }
    }
  }

  return NextResponse.json({ ok: true, recovered: recovered.count, candidates: candidates.length, retried, exhausted })
}
