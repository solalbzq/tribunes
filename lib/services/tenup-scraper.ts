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

/** Erreur spécifique : la page est protégée par le sas d'attente Queue-it. */
export class QueueItBlockedError extends Error {
  constructor() {
    super(
      "Ten'Up est protégé par un sas anti-robots (Queue-it) qui bloque la " +
        'récupération automatique côté serveur. Utilise la saisie manuelle du programme.'
    )
    this.name = 'QueueItBlockedError'
  }
}

/** Vrai si un rendu navigateur (ScrapingBee) est configuré. */
export function hasBrowserRenderer(): boolean {
  return Boolean(process.env.SCRAPINGBEE_API_KEY)
}

/**
 * Rend la page via ScrapingBee : navigateur réel + JS + proxy France.
 * C'est ce qui permet de traverser légitimement le sas Queue-it (la salle
 * d'attente exécute son JS puis redirige d'elle-même vers la vraie page).
 */
async function fetchViaScrapingBee(url: string): Promise<string> {
  const key = process.env.SCRAPINGBEE_API_KEY
  if (!key) throw new Error('SCRAPINGBEE_API_KEY manquant')

  const params = new URLSearchParams({
    api_key: key,
    url,
    render_js: 'true',
    // Proxy résidentiel France : Queue-it lie le jeton à l'IP, on reste cohérent.
    premium_proxy: 'true',
    country_code: 'fr',
    // Laisse le temps au sas Queue-it de faire sa redirection JS.
    wait: '9000',
    // Suivre la navigation jusqu'au retour sur tenup.fft.fr.
    wait_browser: 'load',
  })

  const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`, {
    cache: 'no-store',
  })
  if (res.status === 401) throw new Error("Clé ScrapingBee invalide (401).")
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ScrapingBee a répondu ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`)
  }

  const html = await res.text()
  // Si on est toujours coincé dans le sas malgré le rendu (file active), on le signale.
  if (/enqueuetoken|queue-it\.net/i.test(html) && html.length < 8000) {
    throw new QueueItBlockedError()
  }
  return html
}

/** Fetch direct (sans navigateur). Bloqué par Queue-it sur tenup.fft.fr. */
async function fetchDirect(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
    cache: 'no-store',
    redirect: 'follow',
  })

  // Queue-it intercepte tout le domaine tenup.fft.fr et renvoie sa page de sas.
  if (/queue-it\.net/i.test(res.url)) {
    throw new QueueItBlockedError()
  }
  if (!res.ok) {
    throw new Error(`Ten'Up a répondu ${res.status} pour ${url}`)
  }

  const html = await res.text()
  if (/queue-it|Queue-it|enqueuetoken/.test(html) && html.length < 8000) {
    throw new QueueItBlockedError()
  }
  return html
}

async function fetchHtml(url: string): Promise<string> {
  return hasBrowserRenderer() ? fetchViaScrapingBee(url) : fetchDirect(url)
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

  // 1. Données JSON éventuellement injectées dans la page.
  const blobs = extractEmbeddedJson(html)
  let matches = matchesFromJson(blobs, scope)

  // 2. À défaut, extraction depuis le DOM rendu (page compétitions Ten'Up).
  if (matches.length === 0) {
    matches = parseMatchesFromDom(html, scope)
  }

  const result: TenupScrapeResult = {
    matches,
    scrapedAt: new Date().toISOString(),
  }

  if (matches.length === 0) {
    result.warning = hasBrowserRenderer()
      ? "Page Ten'Up récupérée mais aucune rencontre détectée pour cette période. " +
        'Vérifie la période, ou signale-le pour affiner la lecture de la page.'
      : "Aucune rencontre trouvée. Active le rendu navigateur (clé ScrapingBee) pour " +
        "traverser le sas Ten'Up, ou passe en saisie manuelle."
  }

  return result
}

/**
 * Extraction des rencontres depuis le DOM rendu de /club/ID/competitions.
 *
 * ⚠️ Sélecteurs à finaliser contre une vraie sortie rendue Ten'Up. En attendant,
 * on fait une passe générique : on repère les dates (jj/mm/aaaa ou jour + mois)
 * et les libellés d'équipes à proximité. Renvoie [] si rien de fiable.
 */
function parseMatchesFromDom(_html: string, _scope: TenupScrapeScope): TournamentMatch[] {
  // TODO(tenup): implémenter les sélecteurs précis une fois le HTML rendu obtenu.
  return []
}
