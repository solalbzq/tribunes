import { SUGGESTION_CATALOG, type SuggestionTemplate } from '@/lib/services/editorialSuggestionsCatalog'

export type CalendarMonth = {
  name: string
  moment: string
  ideaIds: string[]
}

/**
 * Saison septembre → juin. Chaque mois pioche dans le catalogue existant
 * (jamais d'idée hors catalogue) et donne le moment de la saison qui justifie
 * le choix. Aucune date ni événement précis : valable pour tous les sports.
 */
export const EDITORIAL_CALENDAR: CalendarMonth[] = [
  { name: 'Septembre', moment: 'La rentrée : les inscriptions battent leur plein.', ideaIds: ['recruitment', 'youth_highlight', 'volunteer_portrait', 'sponsor_week'] },
  { name: 'Octobre', moment: 'La saison est lancée, les habitudes se prennent.', ideaIds: ['coach_portrait', 'behind_the_scenes', 'supporters_call', 'quiz'] },
  { name: 'Novembre', moment: 'Les premiers résultats et le temps qui se rafraîchit.', ideaIds: ['sponsor_week', 'archive', 'volunteer_portrait', 'youth_highlight'] },
  { name: 'Décembre', moment: 'La trêve et les fêtes de fin d’année.', ideaIds: ['supporters_call', 'quiz', 'club_history', 'sponsor_week'] },
  { name: 'Janvier', moment: 'Les bonnes résolutions : le bon moment pour accueillir de nouveaux licenciés.', ideaIds: ['recruitment', 'coach_portrait', 'behind_the_scenes', 'archive'] },
  { name: 'Février', moment: 'Le cœur de la saison, les équipes sont rodées.', ideaIds: ['youth_highlight', 'volunteer_portrait', 'quiz', 'sponsor_week'] },
  { name: 'Mars', moment: 'Les beaux jours approchent et les enjeux montent.', ideaIds: ['supporters_call', 'club_history', 'coach_portrait', 'behind_the_scenes'] },
  { name: 'Avril', moment: 'La dernière ligne droite de la saison.', ideaIds: ['archive', 'youth_highlight', 'quiz', 'volunteer_portrait'] },
  { name: 'Mai', moment: 'Les fins de championnat et les remerciements se préparent.', ideaIds: ['supporters_call', 'sponsor_week', 'coach_portrait', 'club_history'] },
  { name: 'Juin', moment: 'Le bilan de la saison et les inscriptions de l’an prochain.', ideaIds: ['volunteer_portrait', 'recruitment', 'supporters_call', 'archive'] },
]

export function ideasForMonth(month: CalendarMonth): SuggestionTemplate[] {
  return month.ideaIds
    .map((id) => SUGGESTION_CATALOG.find((s) => s.id === id))
    .filter((s): s is SuggestionTemplate => Boolean(s))
}
