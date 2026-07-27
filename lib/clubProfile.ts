import type { VisualConfig } from '@/lib/visualLayout'
import { parseVisualConfig } from '@/lib/visualLayout'

/**
 * Profil "métier" du club (effectifs, canaux, histoire...), édité dans
 * "Gestion du club" mais stocké dans Club.visualConfig (aux côtés de la
 * mise en page du visuel Résultat, éditée dans "Personnalisation") — les
 * deux écrans doivent donc lire-modifier-écrire cette même colonne JSON
 * sans s'écraser l'un l'autre.
 */
export type ClubProfile = {
  city?: string
  foundedYear?: string
  venueName?: string
  venueCapacity?: string
  website?: string
  instagramHandle?: string
  facebookPage?: string
  whatsappLink?: string
  presidentName?: string
  contactEmail?: string
  playerCount?: string
  youthCount?: string
  volunteerCount?: string
  coachCount?: string
  staffCount?: string
  teamCount?: string
  womenCount?: string
  partnerCount?: string
  memberCount?: string
  monthlyPostsTarget?: string
  story?: string
}

export type StoredVisualConfig = VisualConfig & {
  clubProfile?: ClubProfile
}

export const EMPTY_PROFILE: ClubProfile = {
  city: '',
  foundedYear: '',
  venueName: '',
  venueCapacity: '',
  website: '',
  instagramHandle: '',
  facebookPage: '',
  whatsappLink: '',
  presidentName: '',
  contactEmail: '',
  playerCount: '',
  youthCount: '',
  volunteerCount: '',
  coachCount: '',
  staffCount: '',
  teamCount: '',
  womenCount: '',
  partnerCount: '',
  memberCount: '',
  monthlyPostsTarget: '',
  story: '',
}

export function getStoredVisualConfig(raw: unknown): StoredVisualConfig {
  const base = parseVisualConfig(raw)
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
