import type { TournamentMatch } from './fft-pdf-parser'

// ── Types ────────────────────────────────────────────────────────────────

export type TenupScrapeScope =
  | { kind: 'week'; weekStart: Date; weekEnd: Date }
  | { kind: 'day'; day: Date }

export type TenupScrapeResult = {
  matches: TournamentMatch[]
  clubName?: string
  competitionName?: string
  scrapedAt: string
  warning?: string
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// ── URL helpers ──────────────────────────────────────────────────────────

/** Valide qu'une URL ressemble bien à une page Ten'Up FFT. */
export function isTenupUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return /(^|\.)tenup\.fft\.fr$/i.test(u.hostname)
  } catch {
    return false
  }
}

/** Extrait l'identifiant club depuis une URL Ten'Up (ex: /club/12345-nom). */
export function extractClubId(url: string): string | null {
  const m = url.match(/\/club\/(\d+)/)
  return m ? m[1] : null
}

// ── Date helpers ─────────────────────────────────────────────────────────

function inScope(date: Date, scope: TenupScrapeScope): boolean {
  if (scope.kind === 'day') {
    return date.toDateString() === scope.day.toDateString()
  }
  return date >= startOfDay(scope.weekStart) && date <= endOfDay(scope.weekEnd)
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

// ── Fetch ────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
    // Pas de cache : on veut toujours les données à jour
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Ten'Up a répondu ${res.status} pour ${url}`)
  }
  return res.text()
}

// ── Parsing ──────────────────────────────────────────────────────────────

/**
 * Tente d'extraire un état applicatif JSON injecté dans la page.
 * Ten'Up est une SPA Angular : selon les pages, les données de rencontres
 * peuvent être présentes dans un <script> d'état initial. On récupère tout
 * bloc JSON plausible pour le parcourir ensuite.
 */
function extractEmbeddedJson(html: string): unknown[] {
  const blobs: unknown[] = []

  // 1. Balises JSON-LD
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = ldRe.exec(html))) {
    try {
      blobs.push(JSON.parse(m[1].trim()))
    } catch {
      /* ignore */
    }
  }

  // 2. États applicatifs courants (window.__STATE__, __INITIAL_STATE__, etc.)
  const stateRe =
    /(?:window\.__[A-Z_]+__|__INITIAL_STATE__|__NUXT__|__NEXT_DATA__)\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/g
  while ((m = stateRe.exec(html))) {
    try {
      blobs.push(JSON.parse(m[1]))
    } catch {
      /* ignore */
    }
  }

  return blobs
}

/**
 * Parse un ensemble de rencontres depuis les données Ten'Up.
 * NOTE: la forme exacte des objets Ten'Up doit être confirmée sur une vraie
 * page (voir tenup-scraper.parseMatches). En attendant, on cherche des objets
 * possédant date + deux équipes.
 */
function matchesFromJson(blobs: unknown[], scope: TenupScrapeScope): TournamentMatch[] {
  const out: TournamentMatch[] = []

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const obj = node as Record<string, unknown>

    const rawDate =
      (obj.date as string) ??
      (obj.dateRencontre as string) ??
      (obj.startDate as string) ??
      (obj.dateDebut as string)
    const home =
      (obj.equipeDomicile as string) ??
      (obj.home as string) ??
      (obj.equipe1 as string) ??
      pick(obj, ['equipeA', 'teamHome'])
    const away =
      (obj.equipeExterieur as string) ??
      (obj.away as string) ??
      (obj.equipe2 as string) ??
      pick(obj, ['equipeB', 'teamAway'])

    if (rawDate && home && away) {
      const date = new Date(rawDate)
      if (!isNaN(date.getTime()) && inScope(date, scope)) {
        out.push(toTournamentMatch({ date, home: String(home), away: String(away), obj }))
      }
    }

    Object.values(obj).forEach(visit)
  }

  blobs.forEach(visit)
  return out
}

function pick(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v
    if (v && typeof v === 'object' && typeof (v as Record<string, unknown>).nom === 'string') {
      return (v as Record<string, unknown>).nom as string
    }
  }
  return undefined
}

function toTournamentMatch(input: {
  date: Date
  home: string
  away: string
  obj: Record<string, unknown>
}): TournamentMatch {
  const { date, home, away, obj } = input
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const day = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const division =
    (obj.division as string) ?? (obj.competition as string) ?? (obj.championnat as string) ?? ''
  return {
    time: time === '00:00' ? '' : time,
    court: '',
    player1: home,
    club1: '',
    ranking1: '',
    player2: away,
    club2: '',
    ranking2: '',
    category: String(division),
    round: day,
    score: '',
    isPadelPair: false,
    isClubPlayer: true,
    isBye: false,
    isWalkover: false,
  }
}

// ── API publique ───────────────────────────────────────────────────────────

/**
 * Récupère le programme d'un club depuis sa page Ten'Up pour une semaine ou
 * un jour donné.
 *
 * Le parsing JSON couvre le cas où Ten'Up expose ses données dans la page.
 * Si la SPA charge tout via XHR (aucune donnée dans le HTML), on renvoie un
 * résultat vide avec un avertissement plutôt qu'une erreur, pour que l'UI
 * puisse basculer sur la saisie manuelle.
 */
export async function scrapeTenup(
  url: string,
  scope: TenupScrapeScope
): Promise<TenupScrapeResult> {
  if (!isTenupUrl(url)) {
    throw new Error("L'URL fournie n'est pas une page Ten'Up (tenup.fft.fr).")
  }

  const html = await fetchHtml(url)
  const blobs = extractEmbeddedJson(html)
  const matches = matchesFromJson(blobs, scope)

  const result: TenupScrapeResult = {
    matches,
    scrapedAt: new Date().toISOString(),
  }

  if (matches.length === 0) {
    result.warning =
      "Aucune rencontre trouvée dans la page Ten'Up pour cette période. " +
      'La page charge peut-être ses données dynamiquement — passe en saisie manuelle si besoin.'
  }

  return result
}
