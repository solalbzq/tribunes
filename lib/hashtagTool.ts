// Outil public /outils/hashtags : calcul local de hashtags, sans IA ni base de données.
import { SPORT_VOCAB } from './sports'

export const HASHTAG_MOMENTS = [
  { key: 'resultat', label: 'Résultat de match', tags: ['#Resultat', '#Victoire', '#Match'] },
  { key: 'annonce', label: 'Annonce de match', tags: ['#Match', '#JourDeMatch', '#Supporters'] },
  { key: 'evenement', label: 'Événement du club', tags: ['#VieDuClub', '#Evenement', '#Club'] },
  { key: 'benevoles', label: 'Remerciements bénévoles', tags: ['#Benevoles', '#Merci', '#VieAssociative'] },
  { key: 'inscriptions', label: 'Inscriptions', tags: ['#Inscriptions', '#RejoignezNous', '#Club'] },
] as const

export type HashtagMomentKey = (typeof HASHTAG_MOMENTS)[number]['key']

export const HASHTAG_SPORTS = [...Object.keys(SPORT_VOCAB), 'Autre sport']

export type HashtagInput = {
  sport: string
  moment: HashtagMomentKey
  clubName?: string
  city?: string
}

// « Étoile Sportive d’Auch » → « EtoileSportiveAuch » : sans accent, sans espace ni ponctuation.
export function toHashtag(text: string): string {
  const words = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !['de', 'du', 'des', 'la', 'le', 'les', 'd', 'l', 'et'].includes(w.toLowerCase()))
  if (words.length === 0) return ''
  return '#' + words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')
}

export function generateHashtags({ sport, moment, clubName, city }: HashtagInput): string[] {
  const own = [clubName, city].map((t) => toHashtag(t ?? '')).filter(Boolean)
  const sportTags = SPORT_VOCAB[sport]?.hashtags ?? ['#Sport', '#SportAmateur']
  const momentTags = HASHTAG_MOMENTS.find((m) => m.key === moment)?.tags ?? []
  const seen = new Set<string>()
  return [...own, ...sportTags, ...momentTags, '#SportAmateur'].filter((tag) => {
    const k = tag.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
