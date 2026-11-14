import { DEMO_TONES, type DemoTone } from '@/lib/demoPost'
import type { ClubVoice } from '@/lib/voice'

export const DEMO_DEFAULT_CLUB = 'Rugby Club Nîmes'
export const DEMO_DEFAULT_COLOR = '#2563eb'
export const DEMO_DEFAULT_TONE: DemoTone = 'enthousiaste'
export const DEMO_CLUB_MAX_LENGTH = 60

export type DemoPrefill = {
  club?: string
  color?: string
  tone?: ClubVoice
}

const TONE_TO_VOICE: Record<DemoTone, ClubVoice> = {
  enthousiaste: 'STANDARD',
  sobre: 'SOBER',
  humoristique: 'FUN',
}

/** Lien vers l'inscription : seules les valeurs modifiées par l'internaute sont transmises. */
export function buildSignupHref(input: { club: string; color: string; tone: DemoTone }): string {
  const params = new URLSearchParams()
  const club = input.club.trim().slice(0, DEMO_CLUB_MAX_LENGTH)
  if (club && club !== DEMO_DEFAULT_CLUB) params.set('club', club)
  if (/^#[0-9a-f]{6}$/i.test(input.color) && input.color.toLowerCase() !== DEMO_DEFAULT_COLOR) {
    params.set('couleur', input.color.toLowerCase())
  }
  if (input.tone !== DEMO_DEFAULT_TONE) params.set('ton', input.tone)
  const query = params.toString()
  return query ? `/signup?${query}` : '/signup'
}

/** Lit et valide les paramètres d'URL : toute valeur invalide est ignorée. */
export function parseDemoPrefill(params: URLSearchParams): DemoPrefill {
  const result: DemoPrefill = {}
  const club = (params.get('club') ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, DEMO_CLUB_MAX_LENGTH)
  if (club) result.club = club
  const color = params.get('couleur') ?? ''
  if (/^#[0-9a-f]{6}$/i.test(color)) result.color = color.toLowerCase()
  const tone = DEMO_TONES.find((t) => t.id === params.get('ton'))
  if (tone) result.tone = TONE_TO_VOICE[tone.id]
  return result
}
