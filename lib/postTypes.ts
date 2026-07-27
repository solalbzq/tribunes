/**
 * Registre central des types de GeneratedPost.postType (colonne String libre,
 * pas d'enum Prisma). Chaque type pointe vers la relation nullable correspondante
 * sur GeneratedPost (une FK par table source : match, tournamentSchedule, ...).
 *
 * Ajouter un nouveau type de post = ajouter une entrée ici (et la relation
 * correspondante sur GeneratedPost dans schema.prisma) plutôt que de modifier
 * à la main chaque requête OR/include qui liste les sources possibles.
 */
export const POST_TYPES = {
  MATCH_RESULT: { label: 'Résultat', relation: 'match' },
  INTERCLUB_RESULT: { label: 'Résultat interclubs', relation: 'match' },
  TOURNAMENT_SCHEDULE: { label: 'Tournoi', relation: 'tournamentSchedule' },
  WEEKLY_SCHEDULE: { label: 'Programme', relation: 'weeklySchedule' },
  SEASON_RECAP: { label: 'Bilan', relation: 'seasonRecap' },
  MATCH_ANNOUNCEMENT: { label: 'Avant-match', relation: 'matchAnnouncement' },
  PLAYER_SPOTLIGHT: { label: "Joueur à l'honneur", relation: 'playerSpotlight' },
  CLUB_ANNOUNCEMENT: { label: 'Annonce du club', relation: 'clubAnnouncement' },
  ENGAGEMENT_POLL: { label: "Post d'engagement", relation: 'engagementPoll' },
} as const

export type PostType = keyof typeof POST_TYPES

/** Relations distinctes de GeneratedPost à couvrir pour retrouver le club propriétaire d'un post, quel que soit son type. */
export const POST_TYPE_RELATIONS = [...new Set(Object.values(POST_TYPES).map(t => t.relation))]

export function formatPostType(type: string): string {
  return (POST_TYPES as Record<string, { label: string }>)[type]?.label ?? type
}

/** Nom de la colonne FK sur GeneratedPost pour un type de post donné (ex: 'seasonRecapId'). */
export function parentIdField(type: string): string {
  const relation = (POST_TYPES as Record<string, { relation: string }>)[type]?.relation
  if (!relation) throw new Error(`Type de post inconnu: ${type}`)
  return `${relation}Id`
}

/** `OR: [...]` type-agnostique pour filtrer les GeneratedPost d'un club, quelle que soit leur relation source. */
export function clubOwnershipOr(clubId: string) {
  return POST_TYPE_RELATIONS.map(relation => ({ [relation]: { clubId } }))
}

/** `OR: [...]` pour filtrer les GeneratedPost dont le club source a un Telegram lié. */
export function clubTelegramOr() {
  return POST_TYPE_RELATIONS.map(relation => ({ [relation]: { club: { telegramChatId: { not: null } } } }))
}

/** `include` couvrant chaque relation possible, avec un `select.club` identique pour toutes. */
export function relationClubInclude<T extends Record<string, unknown>>(select: T) {
  return Object.fromEntries(POST_TYPE_RELATIONS.map(relation => [relation, { select: { club: { select } } }]))
}

/** `include` couvrant chaque relation possible, en ne sélectionnant que `clubId`. */
export function relationClubIdInclude() {
  return Object.fromEntries(POST_TYPE_RELATIONS.map(relation => [relation, { select: { clubId: true } }]))
}

/** Retrouve le premier `club`/`clubId` non-nul parmi les relations chargées d'un GeneratedPost, quel que soit son type. */
export function findRelationValue<T>(post: Record<string, { club?: T } | { clubId?: T } | null | undefined>, key: 'club' | 'clubId'): T | undefined {
  for (const relation of POST_TYPE_RELATIONS) {
    const value = (post[relation] as Record<string, T> | null | undefined)?.[key]
    if (value) return value
  }
  return undefined
}
