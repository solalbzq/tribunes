import type { BrandKit, SignatureToken } from './types'
import { hashSeed, createRng, pick } from './rng'

const SIGNATURE_MOTIFS: SignatureToken['motif'][] = ['underline', 'corner-dot', 'diagonal-bar']

/**
 * Dérive une signature stable pour un club à partir de son id — en attendant qu'un
 * club puisse un jour choisir explicitement la sienne (cf. plan §5.4/5.5). Stable tant
 * que l'id du club ne change pas : c'est ce qui garantit la reconnaissance visuelle
 * dans le temps, contrairement à une variation par génération.
 */
export function deriveSignature(clubId: string): SignatureToken {
  const rng = createRng(hashSeed(`signature:${clubId}`))
  return {
    motif: pick(rng, SIGNATURE_MOTIFS),
    angle: Math.round((rng() * 10 - 5) * 10) / 10, // léger angle, -5° à +5°, jamais nul (signature ≠ générique)
  }
}

/** Construit un BrandKit à partir des données Club existantes — les facets non exploités restent vides. */
export function resolveBrandKit(club: {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
}): BrandKit {
  return {
    clubName: club.name,
    logoUrl: club.logoUrl,
    primaryColor: club.primaryColor,
    secondaryColor: club.secondaryColor,
    signature: deriveSignature(club.id),
  }
}
