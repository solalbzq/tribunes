import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  scrapeTenup,
  isTenupUrl,
  mondayOf,
  filterMatchesForDay,
  QueueItBlockedError,
} from '@/lib/services/tenup-scraper'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'
import { logScrapeUsage } from '@/lib/usage'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const url = (body.url as string) || club.tenupUrl || ''
  const force = Boolean(body.force)
  if (!url) {
    return NextResponse.json(
      { error: "Aucun lien Ten'Up configuré. Ajoute-le dans les paramètres du club." },
      { status: 400 }
    )
  }
  if (!isTenupUrl(url)) {
    return NextResponse.json(
      { error: "Ce lien n'est pas une page Ten'Up (tenup.fft.fr)." },
      { status: 400 }
    )
  }

  // On raisonne toujours à la semaine : un jour demandé => on scrape et cache
  // toute sa semaine, puis on filtre le jour pour la réponse.
  const dayRequested: Date | null = body.day ? new Date(body.day) : null
  const anchor = dayRequested ?? (body.weekStart ? new Date(body.weekStart) : null)
  if (!anchor || isNaN(anchor.getTime())) {
    return NextResponse.json({ error: 'Précise une semaine (weekStart) ou un jour (day).' }, { status: 400 })
  }
  const weekStart = mondayOf(anchor)

  const respond = (matches: TournamentMatch[], cached: boolean) => {
    const out = dayRequested ? filterMatchesForDay(matches, dayRequested) : matches
    return NextResponse.json({ matches: out, weekMatches: matches, weekStart, cached, scrapedAt: new Date().toISOString() })
  }

  // 1. Cache : renvoie la semaine stockée si présente et pas de rafraîchissement forcé.
  if (!force) {
    const cache = await prisma.tenupSchedule.findUnique({
      where: { clubId_weekStart: { clubId: club.id, weekStart } },
    })
    if (cache) {
      return respond((cache.matches as unknown as TournamentMatch[]) ?? [], true)
    }
  }

  // 2. Sinon on scrape la semaine entière (1 seul appel facturé), on cache, on log.
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  try {
    const result = await scrapeTenup(url, { kind: 'week', weekStart, weekEnd })

    await prisma.tenupSchedule.upsert({
      where: { clubId_weekStart: { clubId: club.id, weekStart } },
      update: { matches: result.matches as unknown as never, clubName: result.clubName, scrapedAt: new Date() },
      create: { clubId: club.id, weekStart, matches: result.matches as unknown as never, clubName: result.clubName },
    })
    await logScrapeUsage(club.id, undefined, { weekStart: weekStart.toISOString(), forced: force })

    const res = respond(result.matches, false)
    if (result.warning) {
      const payload = await res.json()
      return NextResponse.json({ ...payload, warning: result.warning })
    }
    return res
  } catch (err) {
    if (err instanceof QueueItBlockedError) {
      return NextResponse.json({ matches: [], weekMatches: [], weekStart, scrapedAt: new Date().toISOString(), warning: err.message })
    }
    console.error('[tenup/scrape] error:', err)
    return NextResponse.json(
      { error: (err as Error).message ?? "Échec de la récupération Ten'Up" },
      { status: 502 }
    )
  }
}
