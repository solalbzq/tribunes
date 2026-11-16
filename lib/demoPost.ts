export type DemoTone = 'enthousiaste' | 'sobre' | 'humoristique'

export const DEMO_TONES: { id: DemoTone; label: string }[] = [
  { id: 'enthousiaste', label: 'Enthousiaste' },
  { id: 'sobre', label: 'Sobre' },
  { id: 'humoristique', label: 'Humoristique' },
]

export type DemoInput = {
  club: string
  opponent: string
  scoreClub: number
  scoreOpponent: number
  date: string // AAAA-MM-JJ
  tone: DemoTone
}

export type DemoOutcome = 'victoire' | 'nul' | 'defaite'

export function demoOutcome(a: number, b: number): DemoOutcome {
  return a > b ? 'victoire' : a < b ? 'defaite' : 'nul'
}

export function formatDemoDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function clubInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w) && w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return letters || (name.trim().slice(0, 2).toUpperCase() || 'CL')
}

const TEMPLATES: Record<DemoTone, Record<DemoOutcome, string[]>> = {
  enthousiaste: {
    victoire: [
      'Quelle victoire ! {club} s’impose {sc}-{so} face à {opp} {quand}. Bravo à tous les joueurs et merci à nos supporters ! 🔥',
    ],
    nul: ['Match intense ! {club} et {opp} se quittent sur un nul {sc}-{so} {quand}. Quel combat ! 💪'],
    defaite: [
      '{club} s’incline {sc}-{so} face à {opp} {quand}, mais quel match ! On se relève dès la prochaine. Merci pour votre soutien ! 💙',
    ],
  },
  sobre: {
    victoire: ['{club} s’est imposé {sc}-{so} contre {opp} {quand}. Merci aux joueurs et aux supporters.'],
    nul: ['{club} et {opp} ont fait match nul {sc}-{so} {quand}.'],
    defaite: ['{club} s’est incliné {sc}-{so} face à {opp} {quand}. Merci aux supporters pour leur présence.'],
  },
  humoristique: {
    victoire: ['{opp} est reparti avec un {so} et nous avec un {sc}. {club} gagne {quand}, on ne s’en plaindra pas ! 😎'],
    nul: ['{sc}-{so} entre {club} et {opp} {quand}. Personne ne gagne, tout le monde a bien mangé à la buvette ! 🍻'],
    defaite: ['{sc}-{so} pour {opp} {quand}. {club} fait semblant de n’avoir rien vu et file à la buvette. 🍻'],
  },
}

export function buildDemoText(input: DemoInput): string {
  const club = input.club.trim() || 'Votre club'
  const opp = input.opponent.trim() || 'l’équipe adverse'
  const date = formatDemoDate(input.date)
  const outcome = demoOutcome(input.scoreClub, input.scoreOpponent)
  const sc = Math.max(0, Math.floor(input.scoreClub) || 0)
  const so = Math.max(0, Math.floor(input.scoreOpponent) || 0)
  return TEMPLATES[input.tone][outcome][0]
    .replaceAll('{club}', club)
    .replaceAll('{opp}', opp)
    .replaceAll('{sc}', String(sc))
    .replaceAll('{so}', String(so))
    .replaceAll('{quand}', date ? `ce ${date}` : 'récemment')
}
