// Sport-specific configuration for Tribunes

export type SportKey = 'Football' | 'Tennis' | 'Basketball' | 'Volleyball' | 'Handball' | string

// ── Football ──────────────────────────────────────────────────────────────
export type FootballExtra = {
  halfTimeHome: number
  halfTimeAway: number
  scorers: string          // "Lucas 34', Mathieu 78' (pen)"
  cards: string            // "Jaune: Pierre 56' / Rouge: -"
}

// ── Tennis (interclub) ────────────────────────────────────────────────────
// homeScore / awayScore = nombre de matchs remportés par l'équipe
// sets stores detail: "6-4 3-6 7-5" etc.
export type TennisExtra = {
  sets: string             // ex: "6-4, 3-6, 6-2"
  format: string           // "simple" | "double" | "interclubs"
  matchType: string        // "Hommes" | "Femmes" | "Mixte" | "Jeunes"
}

// ── Basketball ────────────────────────────────────────────────────────────
export type BasketballExtra = {
  q1Home: number; q1Away: number
  q2Home: number; q2Away: number
  q3Home: number; q3Away: number
  q4Home: number; q4Away: number
  otHome?: number; otAway?: number  // prolongation
}

// ── Volleyball ────────────────────────────────────────────────────────────
// homeScore / awayScore = sets remportés (ex: 3-2)
export type VolleyballExtra = {
  set1Home: number; set1Away: number
  set2Home: number; set2Away: number
  set3Home?: number; set3Away?: number
  set4Home?: number; set4Away?: number
  set5Home?: number; set5Away?: number
}

// ── Handball ──────────────────────────────────────────────────────────────
export type HandballExtra = {
  halfTimeHome: number
  halfTimeAway: number
  sevenMeters: string      // "4/5 pour nous"
}

export type SportExtra = FootballExtra | TennisExtra | BasketballExtra | VolleyballExtra | HandballExtra

// ── Vocabulary used in AI prompts ─────────────────────────────────────────
export type SportVocab = {
  emoji: string
  scoreUnit: string        // "but" | "point" | "set" | "match"
  winWord: string          // "victoire" | "qualification"
  lossWord: string         // "défaite" | "élimination"
  drawWord: string         // "match nul" | "égalité"
  keyStats: string         // injected in AI prompt
  hashtags: string[]       // base hashtags
}

export const SPORT_VOCAB: Record<string, SportVocab> = {
  Football: {
    emoji: '⚽',
    scoreUnit: 'but',
    winWord: 'victoire',
    lossWord: 'défaite',
    drawWord: 'match nul',
    keyStats: 'tu peux mentionner les buteurs, les phases de jeu marquantes, la mi-temps',
    hashtags: ['#Football', '#Foot', '#Amateur'],
  },
  Tennis: {
    emoji: '🎾',
    scoreUnit: 'match',
    winWord: 'victoire',
    lossWord: 'défaite',
    drawWord: 'égalité',
    keyStats: 'tu peux mentionner les sets, les breaks, les moments clés du match',
    hashtags: ['#Tennis', '#Interclubs', '#Tennis'],
  },
  Basketball: {
    emoji: '🏀',
    scoreUnit: 'point',
    winWord: 'victoire',
    lossWord: 'défaite',
    drawWord: 'égalité',
    keyStats: 'tu peux mentionner les quarts-temps, les paniers à 3 points, la dynamique',
    hashtags: ['#Basketball', '#Basket', '#NBA'],
  },
  Volleyball: {
    emoji: '🏐',
    scoreUnit: 'set',
    winWord: 'victoire',
    lossWord: 'défaite',
    drawWord: 'égalité',
    keyStats: 'tu peux mentionner les sets gagnés/perdus, les points importants, les aces',
    hashtags: ['#Volleyball', '#Volley', '#AmourDuJeu'],
  },
  Handball: {
    emoji: '🤾',
    scoreUnit: 'but',
    winWord: 'victoire',
    lossWord: 'défaite',
    drawWord: 'match nul',
    keyStats: 'tu peux mentionner les mi-temps, les 7 mètres, les arrêts du gardien',
    hashtags: ['#Handball', '#Hand', '#AmourDuJeu'],
  },
}

export function getSportVocab(sport: string): SportVocab {
  return SPORT_VOCAB[sport] ?? {
    emoji: '🏆',
    scoreUnit: 'point',
    winWord: 'victoire',
    lossWord: 'défaite',
    drawWord: 'match nul',
    keyStats: '',
    hashtags: ['#Sport', '#Club'],
  }
}

// ── Extra data string summary for AI prompt ───────────────────────────────
export function formatExtraForPrompt(sport: string, extra: Record<string, unknown>): string {
  if (!extra) return ''
  const lines: string[] = []

  if (sport === 'Football') {
    const e = extra as FootballExtra
    if (e.halfTimeHome !== undefined) lines.push(`Mi-temps : ${e.halfTimeHome}-${e.halfTimeAway}`)
    if (e.scorers) lines.push(`Buteurs : ${e.scorers}`)
    if (e.cards) lines.push(`Cartons : ${e.cards}`)
  }

  if (sport === 'Tennis') {
    const e = extra as TennisExtra
    if (e.sets) lines.push(`Détail des sets : ${e.sets}`)
    if (e.format) lines.push(`Format : ${e.format}`)
    if (e.matchType) lines.push(`Catégorie : ${e.matchType}`)
  }

  if (sport === 'Basketball') {
    const e = extra as BasketballExtra
    lines.push(`Q1: ${e.q1Home}-${e.q1Away} | Q2: ${e.q2Home}-${e.q2Away} | Q3: ${e.q3Home}-${e.q3Away} | Q4: ${e.q4Home}-${e.q4Away}`)
    if (e.otHome !== undefined) lines.push(`Prolongation : ${e.otHome}-${e.otAway}`)
  }

  if (sport === 'Volleyball') {
    const e = extra as VolleyballExtra
    const sets = [
      `S1: ${e.set1Home}-${e.set1Away}`,
      e.set2Home !== undefined ? `S2: ${e.set2Home}-${e.set2Away}` : null,
      e.set3Home !== undefined ? `S3: ${e.set3Home}-${e.set3Away}` : null,
      e.set4Home !== undefined ? `S4: ${e.set4Home}-${e.set4Away}` : null,
      e.set5Home !== undefined ? `S5: ${e.set5Home}-${e.set5Away}` : null,
    ].filter(Boolean)
    lines.push(`Sets : ${sets.join(' | ')}`)
  }

  if (sport === 'Handball') {
    const e = extra as HandballExtra
    if (e.halfTimeHome !== undefined) lines.push(`Mi-temps : ${e.halfTimeHome}-${e.halfTimeAway}`)
    if (e.sevenMeters) lines.push(`7 mètres : ${e.sevenMeters}`)
  }

  return lines.length ? '\n' + lines.map(l => `- ${l}`).join('\n') : ''
}

// ── Score display label (for visuals) ────────────────────────────────────
export function getScoreLabel(sport: string): string {
  if (sport === 'Volleyball') return 'SETS'
  if (sport === 'Tennis') return 'MATCHS'
  return ''
}

// ── Quarters / sets detail lines for visual scoreBlock ────────────────────
export function getDetailLines(sport: string, extra: Record<string, unknown>): string[] {
  if (!extra) return []

  if (sport === 'Basketball') {
    const e = extra as BasketballExtra
    const q = [
      `Q1  ${e.q1Home} – ${e.q1Away}`,
      `Q2  ${e.q2Home} – ${e.q2Away}`,
      `Q3  ${e.q3Home} – ${e.q3Away}`,
      `Q4  ${e.q4Home} – ${e.q4Away}`,
    ]
    if (e.otHome !== undefined) q.push(`OT  ${e.otHome} – ${e.otAway}`)
    return q
  }

  if (sport === 'Volleyball') {
    const e = extra as VolleyballExtra
    return [
      `S1  ${e.set1Home} – ${e.set1Away}`,
      e.set2Home !== undefined ? `S2  ${e.set2Home} – ${e.set2Away}` : null,
      e.set3Home !== undefined ? `S3  ${e.set3Home} – ${e.set3Away}` : null,
      e.set4Home !== undefined ? `S4  ${e.set4Home} – ${e.set4Away}` : null,
      e.set5Home !== undefined ? `S5  ${e.set5Home} – ${e.set5Away}` : null,
    ].filter(Boolean) as string[]
  }

  if (sport === 'Football') {
    const e = extra as FootballExtra
    const lines: string[] = []
    if (e.halfTimeHome !== undefined) lines.push(`Mi-temps  ${e.halfTimeHome} – ${e.halfTimeAway}`)
    if (e.scorers) lines.push(`⚽ ${e.scorers}`)
    return lines
  }

  if (sport === 'Handball') {
    const e = extra as HandballExtra
    const lines: string[] = []
    if (e.halfTimeHome !== undefined) lines.push(`Mi-temps  ${e.halfTimeHome} – ${e.halfTimeAway}`)
    if (e.sevenMeters) lines.push(`7m  ${e.sevenMeters}`)
    return lines
  }

  if (sport === 'Tennis') {
    const e = extra as TennisExtra
    const lines: string[] = []
    if (e.sets) lines.push(e.sets)
    if (e.matchType) lines.push(e.matchType)
    return lines
  }

  return []
}
