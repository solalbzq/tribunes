// Journalisation de la conso (tokens IA + scrapes Ten'Up) par club.
// Non bloquant : une erreur de log ne doit jamais faire échouer une génération.

import { prisma } from './prisma'
import { TENUP_SCRAPE_CREDITS } from './pricing'

type OpenAiCompletionLike = {
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null
}

/** Enregistre la conso d'un appel OpenAI (tokens in/out). */
export async function logAiUsage(
  clubId: string,
  completion: OpenAiCompletionLike,
  model: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        clubId,
        kind: 'ai_generation',
        model,
        tokensIn: completion.usage?.prompt_tokens ?? null,
        tokensOut: completion.usage?.completion_tokens ?? null,
        meta: meta ? (meta as object) : undefined,
      },
    })
  } catch (err) {
    console.warn('[usage] logAiUsage échoué (non bloquant):', err)
  }
}

/** Enregistre la conso d'un scrape Ten'Up réellement facturé. */
export async function logScrapeUsage(
  clubId: string,
  credits: number = TENUP_SCRAPE_CREDITS,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        clubId,
        kind: 'tenup_scrape',
        credits,
        meta: meta ? (meta as object) : undefined,
      },
    })
  } catch (err) {
    console.warn('[usage] logScrapeUsage échoué (non bloquant):', err)
  }
}
