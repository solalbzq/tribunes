import { prisma } from '@/lib/prisma'

/**
 * Collecte de signaux légers sur l'usage de la personnalisation — prépare
 * une future fonctionnalité du type « Vous modifiez souvent ce réglage,
 * voulez-vous l'enregistrer dans votre identité ? » (Lot 8). Ne modifie
 * JAMAIS le Brand Kit du club : uniquement un compteur d'événements agrégé,
 * jamais le texte intégral avant/après un changement.
 *
 * Réutilise UsageEvent (kind='personalization_signal') plutôt qu'une
 * nouvelle table : évite une migration supplémentaire pour un simple
 * compteur, cohérent avec le reste de lib/quota.ts / lib/usage.ts.
 */
export type PersonalizationSignal =
  | 'tone_changed'
  | 'color_changed'
  | 'type_override_saved'
  | 'type_override_reverted'

export async function logPersonalizationSignal(
  clubId: string,
  signal: PersonalizationSignal,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        clubId,
        kind: 'personalization_signal',
        meta: { signal, ...meta },
      },
    })
  } catch (err) {
    console.warn('[personalizationSignals] échoué (non bloquant):', err)
  }
}
