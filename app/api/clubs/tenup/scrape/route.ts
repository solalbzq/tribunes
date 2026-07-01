import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { scrapeTenup, isTenupUrl, type TenupScrapeScope } from '@/lib/services/tenup-scraper'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  // URL Ten'Up : celle du body (test ponctuel) ou celle enregistrée sur le club
  const body = await req.json().catch(() => ({}))
  const url = (body.url as string) || club.tenupUrl || ''
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

  // Portée : jour précis ou semaine
  let scope: TenupScrapeScope
  if (body.day) {
    scope = { kind: 'day', day: new Date(body.day) }
  } else if (body.weekStart) {
    const weekStart = new Date(body.weekStart)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    scope = { kind: 'week', weekStart, weekEnd }
  } else {
    return NextResponse.json({ error: 'Précise une semaine (weekStart) ou un jour (day).' }, { status: 400 })
  }

  try {
    const result = await scrapeTenup(url, scope)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[tenup/scrape] error:', err)
    return NextResponse.json(
      { error: (err as Error).message ?? "Échec de la récupération Ten'Up" },
      { status: 502 }
    )
  }
}
