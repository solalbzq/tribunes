import type { AnnouncementFormInitialValues } from './MatchAnnouncementTab'
import type { TournamentFormInitialValues } from './TournamentTab'

/** Formulaire à rouvrir pré-rempli depuis l'historique (« Refaire un post », « Préparer le rappel de la veille »). */
export type ReusePrefill =
  | { target: 'announcement'; values: AnnouncementFormInitialValues; sourceText: string }
  | { target: 'tournament'; values: TournamentFormInitialValues; sourceText: string }

/** Date du jour au format AAAA-MM-JJ, en heure locale. */
function todayLocal(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

/** Un rappel de la veille n'a de sens que si l'événement a lieu demain ou plus tard. */
export function isUpcomingEvent(isoDate: string): boolean {
  return isoDate.slice(0, 10) > todayLocal()
}

const REMINDER_NOTE = "Rappel de la veille : c'est demain !"

/** Valeurs du rappel d'une annonce d'avant-match : même événement, rien d'inventé. */
export function announcementReminder(a: {
  opponent: string
  matchDate: string
  isHome: boolean
  competition?: string | null
  time?: string | null
  venue?: string | null
  note?: string | null
}): ReusePrefill {
  return {
    target: 'announcement',
    sourceText: 'votre annonce de match (rappel de la veille)',
    values: {
      opponent: a.opponent,
      matchDate: a.matchDate.slice(0, 10),
      isHome: a.isHome,
      ...(a.competition ? { competition: a.competition } : {}),
      ...(a.time ? { time: a.time } : {}),
      ...(a.venue ? { venue: a.venue } : {}),
      note: a.note ? `${REMINDER_NOTE} ${a.note}` : REMINDER_NOTE,
    },
  }
}

type StoredMatch = { opponent?: unknown; time?: unknown; category?: unknown; round?: unknown }

/** Valeurs du rappel d'un tournoi : titre « Demain : … », matchs repris tels qu'enregistrés. */
export function tournamentReminder(t: {
  tournamentName: string
  matchDate: string
  venue?: string | null
  parsedData?: unknown
}): ReusePrefill {
  const stored = (t.parsedData as { clubMatches?: StoredMatch[] } | null | undefined)?.clubMatches
  const matches = (Array.isArray(stored) ? stored : []).flatMap(m =>
    typeof m.opponent === 'string' && typeof m.time === 'string'
      ? [{
          opponent: m.opponent,
          time: m.time,
          ...(typeof m.category === 'string' ? { category: m.category } : {}),
          ...(typeof m.round === 'string' ? { round: m.round } : {}),
        }]
      : []
  )
  return {
    target: 'tournament',
    sourceText: 'votre annonce de tournoi (rappel de la veille)',
    values: {
      tournamentName: `Demain : ${t.tournamentName}`,
      matchDate: t.matchDate.slice(0, 10),
      ...(t.venue ? { venue: t.venue } : {}),
      ...(matches.length ? { matches } : {}),
    },
  }
}
