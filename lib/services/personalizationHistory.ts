import { prisma } from '@/lib/prisma'

// ATTENTION déploiement : ce fichier interroge la table ClubPersonalizationHistory,
// ajoutée par la migration prisma/migrations/20260801100000_add_personalization_override_and_history,
// qui n'est PAS encore appliquée à la base cible (voir lib/services/personalizationOverride.ts
// pour le détail). Ne pas déployer sans avoir exécuté cette migration au préalable.

/** Politique de rétention V1 : pas de branches ni de brouillons, juste les N derniers snapshots. */
export const MAX_PERSONALIZATION_HISTORY_ENTRIES = 20

export type PersonalizationSnapshot = {
  contentTone: string
  customInstructions: string | null
  signaturePhrase: string | null
  bannedWords: string | null
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

/**
 * Ajoute un snapshot append-only de l'identité générale du club après une
 * sauvegarde réussie (`/api/clubs`), puis purge au-delà de la politique de
 * rétention. Ne modifie jamais une entrée existante — sert de filet de
 * sécurité pour l'onboarding rejouable (Lot 4), pas de système de branches.
 */
export async function recordPersonalizationHistory(
  clubId: string,
  userId: string | null,
  snapshot: PersonalizationSnapshot
): Promise<void> {
  await prisma.clubPersonalizationHistory.create({
    data: { clubId, userId, snapshot },
  })

  const excess = await prisma.clubPersonalizationHistory.findMany({
    where: { clubId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_PERSONALIZATION_HISTORY_ENTRIES,
    select: { id: true },
  })
  if (excess.length > 0) {
    await prisma.clubPersonalizationHistory.deleteMany({ where: { id: { in: excess.map(e => e.id) } } })
  }
}

export async function listPersonalizationHistory(clubId: string, limit = MAX_PERSONALIZATION_HISTORY_ENTRIES) {
  return prisma.clubPersonalizationHistory.findMany({
    where: { clubId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/** Scopée par clubId : un club ne doit jamais pouvoir lire/restaurer l'historique d'un autre club. */
export async function getPersonalizationHistoryEntry(clubId: string, historyId: string) {
  return prisma.clubPersonalizationHistory.findFirst({ where: { id: historyId, clubId } })
}
