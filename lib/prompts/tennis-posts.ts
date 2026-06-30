import type { TournamentMatch } from '../services/fft-pdf-parser'

function formatMatchList(matches: TournamentMatch[]): string {
  return matches.map(m => {
    const players = m.isPadelPair
      ? `${m.player1}${m.player1Partner ? ` / ${m.player1Partner}` : ''} vs ${m.player2}${m.player2Partner ? ` / ${m.player2Partner}` : ''}`
      : `${m.player1} vs ${m.player2}`
    return `- ${m.time} · ${m.court} · ${m.category} · ${m.round} · ${players}`
  }).join('\n')
}

// ── TOURNAMENT SCHEDULE ────────────────────────────────────────────────────

export function tournamentSchedulePrompt(
  platform: 'instagram' | 'facebook' | 'whatsapp',
  clubName: string,
  tournamentName: string,
  matchDate: Date,
  venue: string,
  clubMatches: TournamentMatch[]
): string {
  const dateStr = matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const matchList = formatMatchList(clubMatches)

  const base = `Tu es le community manager du club de tennis "${clubName}".
Rédige un post ${platform === 'instagram' ? 'Instagram' : platform === 'facebook' ? 'Facebook' : 'WhatsApp'} pour annoncer la programmation de nos joueurs au tournoi "${tournamentName}".

Informations :
- Date : ${dateStr}
- Lieu : ${venue || tournamentName}
- Nos matchs programmés :
${matchList}

Consignes générales :
- Utilise le vocabulaire tennis exact : set, jeu, ace, break, tie-break (pas "manche", pas "point" pour les sets)
- Cite chaque joueur/joueuse nominalement et son horaire précis
- Mentionne la catégorie du match (ex: Hommes 15/1, Dames 4/6)
- Ton enthousiaste et fédérateur, appelle les supporters à venir
${platform === 'instagram' ? `
Contraintes Instagram :
- Maximum 2200 caractères
- Commence par un emoji accrocheur 🎾
- 5 à 8 hashtags pertinents en fin de post (#tennis #tournoi #${clubName.toLowerCase().replace(/\s/g, '')} #fft)
- Une ligne par joueur pour la lisibilité` : ''}
${platform === 'facebook' ? `
Contraintes Facebook :
- Structuré avec des sauts de ligne clairs
- Plus informatif que Instagram, peut être plus long
- Pas de hashtags en excès (2-3 max)
- Inclure un appel à partager la publication` : ''}
${platform === 'whatsapp' ? `
Contraintes WhatsApp :
- Court et direct, maximum 300 caractères
- Sans hashtags
- Ton SMS/chat entre amis, informel mais enthousiaste
- L'essentiel : qui joue, quand, où` : ''}

Réponds uniquement avec le texte du post, sans guillemets ni introduction.`

  return base
}

// ── WEEKLY INTERCLUB SCHEDULE ──────────────────────────────────────────────

export type WeeklyMatch = {
  teamName: string
  opponent: string
  day: string
  time: string
  homeAway: 'DOMICILE' | 'EXTERIEUR'
  division: string
  venue?: string
}

export function weeklySchedulePrompt(
  platform: 'instagram' | 'facebook' | 'whatsapp',
  clubName: string,
  weekStart: Date,
  weekEnd: Date,
  matches: WeeklyMatch[]
): string {
  const weekStr = `du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`

  const matchList = matches.map(m =>
    `${m.homeAway === 'DOMICILE' ? '🏠' : '✈️'} ${m.teamName} vs ${m.opponent} · ${m.day} ${m.time} · ${m.division}${m.venue ? ` · ${m.venue}` : ''}`
  ).join('\n')

  return `Tu es le community manager du club de tennis "${clubName}".
Rédige un post ${platform} pour annoncer le programme des matchs interclubs de la semaine ${weekStr}.

Matchs à venir :
${matchList}

Consignes :
- Vocabulaire interclubs tennis : "rencontre", "équipe", "capitaine", "journée"
- Un match par ligne avec l'emoji 🏠 domicile ou ✈️ extérieur
- Mentionne la division pour chaque équipe
- Ton mobilisateur : appelle à venir soutenir
${platform === 'instagram' ? '- 4 à 6 hashtags : #tennis #interclubs #${clubName.toLowerCase().replace(/\\s/g, "")} #fft' : ''}
${platform === 'whatsapp' ? '- Court, sans hashtags, style groupe de supporters' : ''}

Réponds uniquement avec le texte du post.`
}

// ── INTERCLUB RESULT ───────────────────────────────────────────────────────

export type ScoreDetail = {
  player: string
  opponent: string
  score: string
  won: boolean
  type: 'SIMPLE' | 'DOUBLE'
}

export function interclubResultPrompt(
  platform: 'instagram' | 'facebook' | 'whatsapp',
  clubName: string,
  teamName: string,
  opponent: string,
  globalScore: string,
  division: string,
  round: string,
  homeAway: 'DOMICILE' | 'EXTERIEUR',
  scoreDetail: ScoreDetail[]
): string {
  const [us, them] = globalScore.split('-').map(Number)
  const outcome = us > them ? 'victoire' : us < them ? 'défaite' : 'match nul'

  const detailList = scoreDetail.map(s =>
    `${s.type === 'DOUBLE' ? '(Double) ' : ''}${s.player} vs ${s.opponent} : ${s.score} → ${s.won ? 'Victoire' : 'Défaite'}`
  ).join('\n')

  const toneInstruction = {
    victoire: 'Célèbre la victoire avec enthousiasme. Remercie les joueurs par leur nom.',
    défaite: 'Ton combatif et positif : valorise l\'effort et la combativité, reste motivant, pas de défaitisme.',
    'match nul': 'Ton équilibré : souligne le point pris, l\'esprit combatif, la belle rencontre.',
  }[outcome]

  return `Tu es le community manager du club de tennis "${clubName}".
Rédige un post ${platform} pour communiquer sur ce résultat interclubs.

Résultat : ${teamName} ${globalScore} ${opponent} (${homeAway.toLowerCase()})
Division : ${division}
${round ? `Journée : ${round}` : ''}

Détail des matchs joués :
${detailList}

Consignes :
- ${toneInstruction}
- Cite le score global en évidence (${globalScore})
- Vocabulaire tennis précis : "simple", "double", "set", "jeu"
- Mention de l'adversaire respectueusement
${platform === 'instagram' ? `- 4-6 hashtags : #tennis #interclubs #${outcome} #fft #${clubName.toLowerCase().replace(/\s/g, '')}` : ''}
${platform === 'whatsapp' ? '- Très court (3-4 lignes max), style message groupe' : ''}
${platform === 'facebook' ? '- Plus narratif, peut mentionner le contexte de championnat' : ''}

Réponds uniquement avec le texte du post.`
}
