// Quota de générations IA par mois calendaire (UTC), selon le plan de l'org.
// 1 génération = 1 appel réussi à une route IA = 1 UsageEvent 'ai_generation'
// (déjà loggé par lib/usage.ts). Comptage par organisation quand le club est
// rattaché à une org, sinon par club.

import { NextResponse } from 'next/server'
import { prisma } from './prisma'
import { PLANS, type PlanKey } from './plans'
import { resolvePlanForClub } from './org'

export type QuotaStatus = {
  allowed: boolean
  used: number
  limit: number | null
  plan: PlanKey
}

export async function checkAiQuota(club: {
  id: string
  orgId: string | null
  userId: string
}): Promise<QuotaStatus> {
  const { plan, orgId } = await resolvePlanForClub(club)
  const limit = PLANS[plan].quotas.aiGenerationsPerMonth
  if (limit == null) return { allowed: true, used: 0, limit: null, plan }

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const used = await prisma.usageEvent.count({
    where: {
      kind: 'ai_generation',
      createdAt: { gte: monthStart },
      ...(orgId ? { club: { orgId } } : { clubId: club.id }),
    },
  })
  return { allowed: used < limit, used, limit, plan }
}

export function quotaExceededResponse(q: QuotaStatus) {
  return NextResponse.json(
    {
      error: `Vous avez utilisé vos ${q.limit} générations IA gratuites ce mois-ci. Passez au plan Club pour des générations illimitées.`,
      code: 'QUOTA_EXCEEDED',
      used: q.used,
      limit: q.limit,
      plan: q.plan,
    },
    { status: 403 }
  )
}
