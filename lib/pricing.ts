// Constantes de coût, éditables. Servent à estimer le coût réel de la conso
// (tokens IA + scrapes Ten'Up) pour fixer les tarifs d'abonnement.

/** Prix OpenAI par modèle, en dollars par million de tokens. */
export const OPENAI_PRICING: Record<string, { in: number; out: number }> = {
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
}

/** Coût d'un crédit ScrapingBee (plan Freelance 49$/250000 crédits). */
export const SCRAPINGBEE_COST_PER_CREDIT = 49 / 250_000

/** Crédits consommés par une récupération Ten'Up (render_js + premium proxy). */
export const TENUP_SCRAPE_CREDITS = 25

export function aiCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = OPENAI_PRICING[model] ?? OPENAI_PRICING['gpt-4o']
  return (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out
}

export function scrapeCostUsd(credits: number): number {
  return credits * SCRAPINGBEE_COST_PER_CREDIT
}

export type UsageEventLike = {
  kind: string
  model: string | null
  tokensIn: number | null
  tokensOut: number | null
  credits: number | null
}

/** Coût total estimé (USD) d'un ensemble d'événements de conso. */
export function estimateCostUsd(events: UsageEventLike[]): number {
  let total = 0
  for (const e of events) {
    if (e.kind === 'ai_generation') {
      total += aiCostUsd(e.model ?? 'gpt-4o', e.tokensIn ?? 0, e.tokensOut ?? 0)
    } else if (e.kind === 'tenup_scrape') {
      total += scrapeCostUsd(e.credits ?? TENUP_SCRAPE_CREDITS)
    }
  }
  return total
}
