import type { PostType } from './postTypes'

const PLACEHOLDER = /\[[^\[\]\n]+\]/g

const JOURS = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche'
const MOIS = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre'
const DATE = new RegExp(
  `(?<![\\p{L}\\d])(?:${JOURS}|${MOIS}|demain|aujourd'hui|ce soir|ce matin|cette semaine|ce week-end|ce weekend)(?![\\p{L}\\d])` +
    '|(?<!\\d)\\d{1,2}\\s?[/.-]\\s?\\d{1,2}(?:\\s?[/.-]\\s?\\d{2,4})?(?!\\d)',
  'iu',
)
const HEURE = /(?<![\p{L}\d])(?:[01]?\d|2[0-3])\s?(?:h|:|heures?)\s?(?:[0-5]\d)?(?![\p{L}\d])|(?<![\p{L}])midi(?![\p{L}])/iu

const TYPES_AVEC_RENDEZ_VOUS: PostType[] = ['CLUB_ANNOUNCEMENT', 'MATCH_ANNOUNCEMENT']

type CheckOptions = {
  /** Type de post : date, heure et lieu ne sont contrôlés que pour les annonces du club et les avant-match. */
  postType?: PostType
  /** Lieu saisi dans le formulaire, quand il existe. Une chaîne vide déclenche l'alerte « lieu manquant ». */
  venue?: string
}

// Vérifie un post avant de le copier ou de le publier.
// Repère les crochets non remplis et, pour les annonces, une date, une heure
// ou un lieu manquants.
// Les alertes ne bloquent jamais : l'utilisateur décide.
export function checkPostBeforePublish(text: string, options: CheckOptions = {}): string[] {
  const alerts: string[] = []
  const found = Array.from(new Set(text.match(PLACEHOLDER) ?? []))
  if (found.length > 0) {
    const label = found.length === 1 ? 'Il reste un passage à compléter' : `Il reste ${found.length} passages à compléter`
    alerts.push(`${label} : ${found.join(', ')}`)
  }
  if (options.postType && TYPES_AVEC_RENDEZ_VOUS.includes(options.postType)) {
    if (!DATE.test(text)) alerts.push('Pensez à indiquer la date du rendez-vous')
    if (!HEURE.test(text)) alerts.push("Pensez à indiquer l'heure du rendez-vous")
    if (options.venue !== undefined && options.venue.trim() === '') alerts.push('Pensez à indiquer le lieu du rendez-vous')
  }
  return alerts
}
