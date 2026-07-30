import type { VisualConfigByFormat } from '@/lib/visualLayout'
import { parseVisualConfigByFormat } from '@/lib/visualLayout'

/**
 * Profil "métier" du club (effectifs, canaux, histoire...), édité dans
 * "Gestion du club" mais stocké dans Club.visualConfig (aux côtés de la
 * mise en page du visuel Résultat, éditée dans "Personnalisation") — les
 * deux écrans doivent donc lire-modifier-écrire cette même colonne JSON
 * sans s'écraser l'un l'autre.
 */
export type ClubProfile = {
  city?: string
  story?: string
}

export type StoredVisualConfig = VisualConfigByFormat & {
  clubProfile?: ClubProfile
}

export const EMPTY_PROFILE: ClubProfile = {
  city: '',
  story: '',
}

export function getStoredVisualConfig(raw: unknown): StoredVisualConfig {
  const base = parseVisualConfigByFormat(raw)
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return base
  const maybeProfile = (raw as { clubProfile?: ClubProfile }).clubProfile
  return {
    ...base,
    clubProfile: maybeProfile ? { ...EMPTY_PROFILE, ...maybeProfile } : undefined,
  }
}

export function pruneProfile(profile: ClubProfile): ClubProfile | undefined {
  const entries = Object.entries(profile).filter(([, value]) => String(value ?? '').trim() !== '')
  if (entries.length === 0) return undefined
  return Object.fromEntries(entries) as ClubProfile
}
