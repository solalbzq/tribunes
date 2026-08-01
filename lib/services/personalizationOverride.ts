import { prisma } from '@/lib/prisma'
import type { PersonalizationTypeOverride } from '@/lib/personalization'
import type { PostType } from '@/lib/postTypes'

// ATTENTION déploiement : ce fichier interroge la table ClubPersonalizationOverride,
// ajoutée par la migration prisma/migrations/20260801100000_add_personalization_override_and_history.
// Cette migration n'est PAS appliquée automatiquement (générée manuellement,
// `prisma migrate dev` refusant de s'exécuter en environnement non-interactif
// sur cette base partagée). Ne pas déployer ce code sans avoir au préalable
// exécuté `npx prisma migrate deploy` (ou équivalent) contre la base cible —
// sinon les 13 routes de génération et la sauvegarde du club échoueront
// (table absente) tant que la migration n'est pas appliquée.

/**
 * Lit l'override de personnalisation d'un club pour un type de publication
 * donné (lib/postTypes.ts). Retourne `null` si aucune variante n'a été
 * enregistrée — la résolution retombe alors entièrement sur l'identité
 * générale du club (comportement identique à avant l'introduction de cette
 * table, garanti par resolvePersonalization).
 */
export async function getPersonalizationOverride(clubId: string, postType: PostType): Promise<PersonalizationTypeOverride> {
  return prisma.clubPersonalizationOverride.findUnique({
    where: { clubId_postType: { clubId, postType } },
    select: { voiceOverride: true, customInstructions: true, signaturePhrase: true },
  })
}
