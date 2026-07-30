import { NextRequest, NextResponse } from 'next/server'

import { ensureAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { relationClubInclude, findRelationValue } from '@/lib/postTypes'

/**
 * Conditions volontairement binaires (pas de tendance/seuil relatif — bruit
 * garanti à faible volume de clients, cf. audit admin). Chaque alerte est
 * adossée à une donnée réellement en base. Paiement Stripe échoué et échec
 * de cron nécessiteraient une instrumentation supplémentaire non construite
 * ici (pas de modèle Payment/Invoice, pas d'historique de run de cron) —
 * volontairement absents plutôt que fabriqués.
 */
const EXPIRY_WARNING_MS = 7 * 24 * 60 * 60 * 1000
const RECENT_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000
const STUCK_PUBLISHING_MINUTES = 15

export async function GET(request: NextRequest) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const soon = new Date(now.getTime() + EXPIRY_WARNING_MS)
  const failureWindowStart = new Date(now.getTime() - RECENT_FAILURE_WINDOW_MS)
  const stuckPublishingBefore = new Date(now.getTime() - STUCK_PUBLISHING_MINUTES * 60 * 1000)

  const [expiredTokens, expiringTokens, recentFailures, stuckPublishing] = await Promise.all([
    prisma.socialConnection.findMany({
      where: { tokenExpiresAt: { lt: now } },
      select: { id: true, provider: true, accountName: true, club: { select: { id: true, name: true } } },
    }),
    prisma.socialConnection.findMany({
      where: { tokenExpiresAt: { gte: now, lt: soon } },
      select: { id: true, provider: true, accountName: true, club: { select: { id: true, name: true } } },
    }),
    prisma.generatedPost.findMany({
      where: {
        status: { in: ['FAILED', 'PARTIAL'] },
        platform: { not: 'whatsapp' },
        createdAt: { gte: failureWindowStart },
      },
      select: {
        id: true, platform: true, status: true, createdAt: true, rejectedReason: true,
        ...relationClubInclude({ id: true, name: true }),
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.generatedPost.findMany({
      where: { status: 'PUBLISHING', createdAt: { lt: stuckPublishingBefore } },
      select: {
        id: true, platform: true, createdAt: true,
        ...relationClubInclude({ id: true, name: true }),
      },
    }),
  ])

  const alerts = [
    ...expiredTokens.map((c) => ({
      id: `token-expired-${c.id}`,
      severity: 'critical' as const,
      title: `Token ${c.provider} expiré`,
      scope: c.club.name,
      detail: c.accountName,
      cause: 'Le token d\'accès a expiré, la publication automatique va échouer pour ce club.',
      action: 'Redemander une connexion au club (déconnecter puis reconnecter Facebook/Instagram).',
      link: `/admin?tab=integrations`,
    })),
    ...expiringTokens.map((c) => ({
      id: `token-expiring-${c.id}`,
      severity: 'warning' as const,
      title: `Token ${c.provider} expire sous 7 jours`,
      scope: c.club.name,
      detail: c.accountName,
      cause: 'Le token d\'accès arrive à expiration.',
      action: 'Prévenir le club pour qu\'il renouvelle la connexion avant expiration.',
      link: `/admin?tab=integrations`,
    })),
    ...stuckPublishing.map((p) => {
      const club = findRelationValue<{ id: string; name: string }>(
        p as unknown as Record<string, { club?: { id: string; name: string } } | null>,
        'club',
      )
      return {
        id: `stuck-publishing-${p.id}`,
        severity: 'critical' as const,
        title: 'Publication bloquée en cours de publication',
        scope: club?.name ?? 'Club inconnu',
        detail: `${p.platform} — depuis ${Math.round((now.getTime() - new Date(p.createdAt).getTime()) / 60000)} min`,
        cause: 'Le post est resté en PUBLISHING au-delà du délai normal — signe probable d\'un crash pendant l\'appel à l\'API réseau social.',
        action: 'Vérifier manuellement si la publication a réussi côté réseau social, puis corriger le statut.',
        link: `/admin?tab=publications`,
      }
    }),
  ]

  const failuresByClub = new Map<string, { clubName: string; count: number }>()
  for (const post of recentFailures) {
    const club = findRelationValue<{ id: string; name: string }>(
      post as unknown as Record<string, { club?: { id: string; name: string } } | null>,
      'club',
    )
    const key = club?.id ?? 'unknown'
    const entry = failuresByClub.get(key) ?? { clubName: club?.name ?? 'Club inconnu', count: 0 }
    entry.count += 1
    failuresByClub.set(key, entry)
  }
  for (const [, { clubName, count }] of failuresByClub) {
    alerts.push({
      id: `recent-failures-${clubName}`,
      severity: 'warning' as const,
      title: `${count} publication(s) échouée(s) dans les dernières 24h`,
      scope: clubName,
      detail: '',
      cause: 'Échecs de publication récents pour ce club.',
      action: 'Consulter le détail dans Publications, filtrer par club et par statut FAILED/PARTIAL.',
      link: `/admin?tab=publications`,
    })
  }

  return NextResponse.json({ alerts, total: alerts.length })
}
