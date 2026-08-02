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
]

export function findSuggestionTemplate(id: string): SuggestionTemplate | undefined {
  return SUGGESTION_CATALOG.find(s => s.id === id)
}

const MAX_SUGGESTIONS = 5

/** Ne retient que des ids réellement présents dans le catalogue — jamais une idée inventée par le modèle. Pure, testée. */
export function parseSuggestedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const validIds = new Set(SUGGESTION_CATALOG.map(s => s.id))
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
