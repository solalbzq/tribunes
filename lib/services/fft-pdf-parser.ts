// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js')
import { normalizeText } from '../utils/text'

export type TournamentMatch = {
  time: string
  court: string
  player1: string
  club1: string
  ranking1: string
  player2: string
  club2: string
  ranking2: string
  category: string
  round: string
  score: string
  isPadelPair: boolean
  player1Partner?: string
  player2Partner?: string
  isClubPlayer: boolean
  isBye: boolean
  isWalkover: boolean
}

export type ParsedTournamentPdf = {
  matchDate: Date
  tournamentName: string
  venue: string
  matches: TournamentMatch[]
  clubMatches: TournamentMatch[]
  sport: 'TENNIS' | 'PADEL'
  rawText: string
}

// ── Patterns ───────────────────────────────────────────────────────────────

// Time: "09:00" or "9h00"
const TIME_RE = /^(\d{1,2})[h:](\d{2})$/

// Category: SD/SM/DD/DM/MX/SG/SJ etc + level
const CATEGORY_RE = /^(SD|SM|DD|DM|MX|SG|SJ|SC|SV|SB|JG|JF|CG|CF|MG|MF)\s+/i

// Round keywords
const ROUND_RE = /^(tableau principal|places?\s+\d|quarts?|demi|finale|1er tour|2[eè]me? tour|\d+[eè]me? tour)/i

// Ranking: "30/1", "15/2", "4/6", "NC", "30", "−4/6" etc, possibly prepended to a name
const RANKING_PREFIX_RE = /^((?:−|-)?\d+(?:\/\d+)?|NC)\s*/i

// Club name heuristic: starts with "TC", "US", "AS", "CA", "SC", "TT", "ST" etc or is all caps-ish
const CLUB_RE = /^(TC|US|AS|CA|SC|TT|ST|CS|SL|ATC|CTT|LTC|AC|SP|RC|EC|TS)\b/i

// Score: digits / digits (sets)
const SCORE_RE = /^[\d]+\/[\d]+([\s\d/]+)?$/

// Player name: has uppercase letters and spaces, no slash, more than 3 chars
function looksLikeName(line: string): boolean {
  return (
    line.length > 3 &&
    /[A-ZÀÂÉÈÊËÎÏÔÙÛÜÆŒ]/.test(line) &&
    !/^\d/.test(line) &&
    !ROUND_RE.test(line) &&
    !CATEGORY_RE.test(line) &&
    line !== 'vs' &&
    !TIME_RE.test(line)
  )
}

// ── Date extraction ────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
}

function extractMatchDate(text: string): Date {
  // "DIMANCHE 12 AVRIL 2026" or "Programmation du 15/06/2025"
  const m1 = text.match(/\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\b/i)
  if (m1) {
    const month = MONTHS[m1[2].toLowerCase()] ?? 1
    return new Date(`${m1[3]}-${String(month).padStart(2, '0')}-${m1[1].padStart(2, '0')}`)
  }
  const m2 = text.match(/[Pp]rogramm\w+\s+du\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m2) return new Date(`${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`)
  return new Date()
}

function extractMeta(text: string): { tournamentName: string; venue: string } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  // First non-date, non-weekday substantial line
  const skipWords = /programmation|dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi|horaire/i
  const tournamentName = lines.find(l => l.length > 5 && !skipWords.test(l)) ?? 'Tournoi'
  return { tournamentName, venue: '' }
}

function detectSport(text: string): 'TENNIS' | 'PADEL' {
  return (text.match(/padel/gi)?.length ?? 0) > (text.match(/tennis/gi)?.length ?? 0) ? 'PADEL' : 'TENNIS'
}

// ── Club / player matching ─────────────────────────────────────────────────

function matchesFilter(match: TournamentMatch, filter: string): boolean {
  if (!filter) return true
  const f = normalizeText(filter)
  const fields = [match.player1, match.player2, match.club1, match.club2,
                  match.player1Partner ?? '', match.player2Partner ?? '']
  return fields.some(v => normalizeText(v).includes(f))
}

// ── Block-based parser for FFT format ─────────────────────────────────────
//
// Real FFT format (from actual PDF):
//   [optional time line]
//   [category]         e.g. "SD Senior"
//   [round]            e.g. "Tableau principal"
//   [player1]          e.g. "MERARD Florence"
//   [club1]            e.g. "TC GENERAC"
//   [ranking1+player2] e.g. "30/1ALLÈGRE Marjorie"  (concatenated)
//   [club2]            e.g. "TC BEAUVOISIN"
//   [ranking2]         e.g. "30/5"
//   vs
//   [score]            e.g. "4/0 4/1"

function splitRankingAndName(raw: string): { ranking: string; name: string } {
  // Match leading ranking like "30/1", "−4/6", "NC" then the rest is the name
  const m = raw.match(/^((?:[−-]?\d+(?:\/\d+)?|NC))\s*(.+)$/i)
  if (m) return { ranking: m[1], name: m[2].trim() }
  return { ranking: '', name: raw.trim() }
}

function parseBlocks(lines: string[]): TournamentMatch[] {
  const matches: TournamentMatch[] = []
  let currentTime = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // Time line
    const timeMatch = TIME_RE.exec(line)
    if (timeMatch) {
      currentTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
      i++; continue
    }

    // Category line → start a match block
    if (CATEGORY_RE.test(line)) {
      const category = line
      i++
      if (i >= lines.length) break

      // Round
      const round = ROUND_RE.test(lines[i]?.trim() ?? '') ? lines[i].trim() : ''
      if (round) i++

      // Player 1
      const player1 = lines[i]?.trim() ?? ''
      if (!looksLikeName(player1)) { i++; continue }
      i++

      // Club 1
      const club1 = lines[i]?.trim() ?? ''
      i++

      // Ranking1 + Player2 (concatenated)
      const rankAndP2 = lines[i]?.trim() ?? ''
      i++
      const { ranking: ranking1, name: player2 } = splitRankingAndName(rankAndP2)

      // Club 2
      const club2 = lines[i]?.trim() ?? ''
      i++

      // Ranking 2
      const ranking2Line = lines[i]?.trim() ?? ''
      const ranking2 = RANKING_PREFIX_RE.test(ranking2Line) ? ranking2Line : ''
      if (ranking2) i++

      // "vs"
      if (lines[i]?.trim() === 'vs') i++

      // Score (collect all score-like lines)
      const scoreParts: string[] = []
      while (i < lines.length && SCORE_RE.test(lines[i].trim())) {
        scoreParts.push(lines[i].trim())
        i++
      }
      const score = scoreParts.join(' ')

      if (!player1 || !player2) continue

      const isBye = /bye/i.test(player1 + player2)
      const isWalkover = /walkover|w\.o/i.test(player1 + player2 + score)

      matches.push({
        time: currentTime,
        court: '',
        player1: player1.trim(),
        club1: club1.trim(),
        ranking1: ranking1.trim(),
        player2: player2.trim(),
        club2: club2.trim(),
        ranking2: ranking2.trim(),
        category: category.trim(),
        round: round.trim(),
        score: score.trim(),
        isPadelPair: /DD|DM|MX/i.test(category),
        isClubPlayer: false,
        isBye,
        isWalkover,
      })
      continue
    }

    i++
  }

  return matches
}

// ── Main export ────────────────────────────────────────────────────────────

export async function parseFftPdf(
  pdfBuffer: Buffer,
  clubName: string
): Promise<ParsedTournamentPdf> {
  const result = await pdfParse(pdfBuffer)
  const text: string = result.text

  const matchDate = extractMatchDate(text)
  const { tournamentName, venue } = extractMeta(text)
  const sport = detectSport(text)

  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const matches = parseBlocks(lines)

  // Tag isClubPlayer
  matches.forEach(m => {
    m.isClubPlayer = matchesFilter(m, clubName)
  })

  const clubMatches = clubName
    ? matches.filter(m => m.isClubPlayer)
    : matches

  // Fallback: show all if filter found nothing
  const finalClubMatches = clubMatches.length > 0 ? clubMatches : matches

  return {
    matchDate,
    tournamentName,
    venue,
    matches,
    clubMatches: finalClubMatches,
    sport,
    rawText: text,
  }
}
