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

// Garde-fou technique anti-abus pour l'extraction d'intention (kind
// 'intent_extraction'), distinct du quota commercial ci-dessus : ce n'est
// pas une "génération" facturable/plafonnée par plan, juste une limite de
// fréquence pour éviter un coût OpenAI illimité. Scopé par org comme
// checkAiQuota pour éviter qu'une org multi-clubs contourne la limite en
// répartissant les appels entre ses clubs.
const INTENT_EXTRACTION_RATE_LIMIT = 20
const INTENT_EXTRACTION_WINDOW_MS = 60 * 60 * 1000

export async function checkIntentExtractionRateLimit(club: {
  id: string
  orgId: string | null
  userId: string
}): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { orgId } = await resolvePlanForClub(club)
  const since = new Date(Date.now() - INTENT_EXTRACTION_WINDOW_MS)
  const used = await prisma.usageEvent.count({
    where: {
      kind: 'intent_extraction',
      createdAt: { gte: since },
      ...(orgId ? { club: { orgId } } : { clubId: club.id }),
    },
  })
  return { allowed: used < INTENT_EXTRACTION_RATE_LIMIT, used, limit: INTENT_EXTRACTION_RATE_LIMIT }
}

export function intentExtractionRateLimitedResponse() {
  return NextResponse.json(
    { error: "Trop de demandes d'analyse en peu de temps. Réessaie dans quelques minutes.", code: 'RATE_LIMITED' },
    { status: 429 }
  )
}

// Même logique pour l'analyse IA des références visuelles/chartes importées
// (Lot 5) : ni une génération de contenu (pas de quota commercial), ni un
// coût récurrent attendu (analyse ponctuelle par fichier) — juste un
// garde-fou anti-abus pour éviter des ré-analyses répétées sans limite.
const BRAND_ASSET_ANALYSIS_RATE_LIMIT = 10
const BRAND_ASSET_ANALYSIS_WINDOW_MS = 60 * 60 * 1000

export async function checkBrandAssetAnalysisRateLimit(club: {
  id: string
  orgId: string | null
  userId: string
}): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { orgId } = await resolvePlanForClub(club)
  const since = new Date(Date.now() - BRAND_ASSET_ANALYSIS_WINDOW_MS)
  const used = await prisma.usageEvent.count({
    where: {
      kind: 'brand_asset_analysis',
      createdAt: { gte: since },
      ...(orgId ? { club: { orgId } } : { clubId: club.id }),
    },
  })
  return { allowed: used < BRAND_ASSET_ANALYSIS_RATE_LIMIT, used, limit: BRAND_ASSET_ANALYSIS_RATE_LIMIT }
}

export function brandAssetAnalysisRateLimitedResponse() {
  return NextResponse.json(
    { error: "Trop d'analyses en peu de temps. Réessaie dans quelques minutes.", code: 'RATE_LIMITED' },
    { status: 429 }
  )
}
