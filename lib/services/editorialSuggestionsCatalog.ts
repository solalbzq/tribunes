/**
 * Catalogue fixe d'idées de publication — le modèle IA ne fait que
 * sélectionner et classer un sous-ensemble pertinent pour le club (jamais
 * inventer une idée hors catalogue), ce qui borne le risque d'hallucination
 * à un simple choix parmi une liste fermée.
 */
export type SuggestionTemplate = {
  id: string
  label: string
  objective: string
  subject: string
  keyInformation: string[]
  suggestedCategory: string
  /**
   * Certaines idées correspondent explicitement à une catégorie d'Annonce du
   * club déjà structurée (RECRUITMENT/SPONSOR/VOLUNTEER/THANKS) — les router
   * vers ce type plutôt que vers CUSTOM_POST donne un visuel dédié plus
   * pertinent. Les idées qui ne correspondent à aucun type existant restent
   * sur CUSTOM_POST (target absent = customPost).
   */
  /**
   * Mois conseillés (1 = janvier … 12 = décembre) pour les idées de saison.
   * Absent = idée permanente, proposée toute l'année.
   */
  months?: number[]
  target?: { kind: 'clubAnnouncement'; category: 'RECRUITMENT' | 'SPONSOR' | 'VOLUNTEER' | 'THANKS' }
}

export const SUGGESTION_CATALOG: SuggestionTemplate[] = [
  { id: 'volunteer_portrait', label: "Portrait d'un bénévole", objective: 'Remercier et mettre en lumière un bénévole du club', subject: "Portrait d'un bénévole engagé", keyInformation: ['Nom et rôle du bénévole', 'Depuis combien de temps il/elle aide le club'], suggestedCategory: 'portrait_benevole', target: { kind: 'clubAnnouncement', category: 'VOLUNTEER' } },
  { id: 'behind_the_scenes', label: 'Dans les coulisses du club', objective: 'Montrer un aspect méconnu de la vie du club', subject: 'Les coulisses du club', keyInformation: ['Ce que vous voulez montrer (entraînement, préparation, local...)'], suggestedCategory: 'coulisses' },
  { id: 'club_history', label: 'Histoire du club', objective: 'Raconter un moment marquant de l’histoire du club', subject: 'Un souvenir de l’histoire du club', keyInformation: ['Année ou période concernée', 'Anecdote ou fait marquant'], suggestedCategory: 'histoire_club' },
  { id: 'sponsor_week', label: 'Sponsor de la semaine', objective: 'Remercier et mettre en avant un partenaire', subject: 'Sponsor de la semaine', keyInformation: ['Nom du sponsor', 'Ce qu’il apporte au club'], suggestedCategory: 'sponsor', target: { kind: 'clubAnnouncement', category: 'SPONSOR' } },
  { id: 'supporters_call', label: 'Un mot pour nos supporters', objective: 'Remercier et mobiliser les supporters', subject: 'Message à nos supporters', keyInformation: [], suggestedCategory: 'appel_supporters', target: { kind: 'clubAnnouncement', category: 'THANKS' } },
  { id: 'youth_highlight', label: 'Mise en avant de nos jeunes', objective: 'Valoriser la section jeunes du club', subject: 'Nos jeunes à l’honneur', keyInformation: ['Catégorie d’âge ou équipe concernée'], suggestedCategory: 'jeunes' },
  { id: 'recruitment', label: 'Rejoignez le club', objective: 'Recruter de nouveaux licenciés', subject: 'Le club recrute', keyInformation: ['Catégories concernées', 'Modalités d’inscription'], suggestedCategory: 'recrutement', target: { kind: 'clubAnnouncement', category: 'RECRUITMENT' } },
  { id: 'quiz', label: 'Quiz supporters', objective: 'Engager la communauté avec un quiz sur le club', subject: 'Quiz : connaissez-vous bien votre club ?', keyInformation: [], suggestedCategory: 'quiz' },
  { id: 'archive', label: "Souvenir d'archive", objective: 'Partager une photo ou un souvenir marquant du passé', subject: 'Un souvenir d’archive', keyInformation: ['Période ou événement concerné'], suggestedCategory: 'archive' },
  { id: 'coach_portrait', label: "Portrait d'un éducateur", objective: 'Mettre en avant un entraîneur ou éducateur du club', subject: "Portrait d'un éducateur", keyInformation: ['Nom et rôle', 'Ce qu’il apporte à ses joueurs/joueuses'], suggestedCategory: 'portrait_educateur' },
  { id: 'season_registrations', label: 'Inscriptions de la rentrée', objective: 'Annoncer l’ouverture des inscriptions pour la nouvelle saison', subject: 'Les inscriptions sont ouvertes', keyInformation: ['Dates et lieux d’inscription', 'Pièces à fournir', 'Contact du club'], suggestedCategory: 'inscriptions', months: [6, 7, 8, 9], target: { kind: 'clubAnnouncement', category: 'RECRUITMENT' } },
  { id: 'open_day', label: 'Portes ouvertes / séance d’essai', objective: 'Inviter de nouvelles personnes à découvrir le club lors d’une séance d’essai', subject: 'Venez essayer, portes ouvertes au club', keyInformation: ['Date, heure et lieu', 'Public concerné', 'Ce qu’il faut apporter'], suggestedCategory: 'portes_ouvertes', months: [8, 9, 10], target: { kind: 'clubAnnouncement', category: 'RECRUITMENT' } },
  { id: 'general_assembly', label: 'Convocation à l’assemblée générale', objective: 'Convoquer les adhérents à l’assemblée générale du club', subject: 'Convocation à l’assemblée générale', keyInformation: ['Date, heure et lieu', 'Ordre du jour', 'Modalités de vote ou de procuration'], suggestedCategory: 'assemblee_generale', months: [5, 6, 9, 10, 11] },
  { id: 'club_meal', label: 'Loto ou repas du club', objective: 'Inviter les adhérents et leurs proches au loto ou au repas du club', subject: 'Loto / repas du club', keyInformation: ['Date, heure et lieu', 'Tarifs et réservation', 'Contact pour s’inscrire'], suggestedCategory: 'evenement_convivial', months: [10, 11, 12, 1, 2, 3] },
  { id: 'club_tournament', label: 'Tournoi ou fête du club', objective: 'Annoncer le tournoi ou la fête du club', subject: 'Tournoi / fête du club', keyInformation: ['Date, heure et lieu', 'Programme de la journée', 'Modalités d’inscription'], suggestedCategory: 'tournoi_fete', months: [5, 6, 9] },
  { id: 'season_greetings', label: 'Vœux de fin d’année', objective: 'Présenter les vœux du club à ses adhérents et partenaires', subject: 'Les vœux du club', keyInformation: ['Message du président ou du bureau', 'Dates de reprise des activités'], suggestedCategory: 'voeux', months: [12, 1] },
  { id: 'awards_ceremony', label: 'Remise des récompenses', objective: 'Remercier et féliciter les membres récompensés à la fin de la saison', subject: 'Remise des récompenses', keyInformation: ['Date et lieu de la remise', 'Récompenses et personnes à l’honneur'], suggestedCategory: 'recompenses', months: [5, 6, 7], target: { kind: 'clubAnnouncement', category: 'THANKS' } },
  { id: 'season_review', label: 'Bilan et remerciements de fin de saison', objective: 'Faire le bilan de la saison et remercier bénévoles, partenaires et adhérents', subject: 'Merci pour cette saison', keyInformation: ['Moments forts de la saison', 'Personnes ou partenaires à remercier'], suggestedCategory: 'bilan_saison', months: [6, 7], target: { kind: 'clubAnnouncement', category: 'THANKS' } },
]

export function findSuggestionTemplate(id: string): SuggestionTemplate | undefined {
  return SUGGESTION_CATALOG.find(s => s.id === id)
}

/** Une idée permanente est toujours disponible ; une idée de saison seulement pendant ses mois conseillés. */
export function isSuggestionAvailable(s: SuggestionTemplate, month: number): boolean {
  return !s.months || s.months.includes(month)
}

/** Idées du catalogue proposables au mois donné (1-12). */
export function getAvailableSuggestions(month: number): SuggestionTemplate[] {
  return SUGGESTION_CATALOG.filter(s => isSuggestionAvailable(s, month))
}

const MAX_SUGGESTIONS = 5

/** Ne retient que des ids réellement présents dans le catalogue — jamais une idée inventée par le modèle. Pure, testée. */
export function parseSuggestedIds(raw: unknown, month?: number): string[] {
  if (!Array.isArray(raw)) return []
  const pool = month === undefined ? SUGGESTION_CATALOG : getAvailableSuggestions(month)
  const validIds = new Set(pool.map(s => s.id))
  const seen = new Set<string>()
  const result: string[] = []
  for (const v of raw) {
    if (typeof v === 'string' && validIds.has(v) && !seen.has(v)) {
      seen.add(v)
      result.push(v)
      if (result.length >= MAX_SUGGESTIONS) break
    }
  }
  return result
}
