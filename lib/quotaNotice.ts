// Message affiché dans le dashboard quand le quota gratuit du mois est épuisé.
// Client-safe : aucune dépendance serveur. Le comptage vient de checkAiQuota
// (lib/quota.ts), qui calcule le mois en UTC : la remise à zéro suit le même repère.

import type { PlanKey } from './plans'

export type QuotaNotice = {
  message: string
  resetDate: string
}

/** 1er du mois suivant (UTC), date de remise à zéro du quota mensuel. */
export function nextQuotaResetDate(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

export function formatResetDate(date: Date): string {
  const day = date.getUTCDate() === 1 ? '1er' : String(date.getUTCDate())
  const month = date.toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' })
  return `${day} ${month} ${date.getUTCFullYear()}`
}

/** Renvoie le message à afficher, ou null si le quota n'est pas épuisé (ou illimité). */
export function quotaNotice(
  status: { plan: PlanKey; used: number; limit: number | null },
  now: Date = new Date(),
): QuotaNotice | null {
  if (status.plan !== 'FREE' || status.limit == null || status.used < status.limit) return null
  const resetDate = nextQuotaResetDate(now)
  return {
    resetDate: resetDate.toISOString(),
    message: `Vous avez utilisé vos ${status.limit} visuels du mois. Ils reviennent le ${formatResetDate(resetDate)}. Passez au plan Club pour des publications illimitées.`,
  }
}
