import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { resolveBrandKit } from '@/lib/designEngine/brandKit'
import { composeMatchResult } from '@/lib/designEngine/orchestrator'
import { renderCompositionToPng } from '@/lib/designEngine/render/satoriRenderer'
import type { DesignFamilyId } from '@/lib/designEngine/types'

const DESIGN_FAMILIES: DesignFamilyId[] = ['minimal', 'editorial', 'bold', 'premium', 'dynamic']

/**
 * Route strictement interne au prototype "Design Engine" (cf. docs/design-engine-plan.md).
 * Isolée du moteur de rendu actuel : ne réutilise ni lib/visualLayout.ts ni les
 * générateurs canvas existants. Le club connecté ne peut rendre qu'un de ses propres
 * matchs (jamais un id fourni sans vérification de propriété).
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const url = new URL(req.url)
  const matchIdParam = url.searchParams.get('matchId')
  const family = (url.searchParams.get('family') ?? 'minimal') as DesignFamilyId
  const seed = url.searchParams.get('seed') ?? '0'
  if (!matchIdParam) return NextResponse.json({ error: 'matchId requis' }, { status: 400 })
  if (!DESIGN_FAMILIES.includes(family)) {
    return NextResponse.json({ error: 'family invalide' }, { status: 400 })
  }

  const match = matchIdParam === 'latest'
    ? await prisma.matchResult.findFirst({ where: { clubId: club.id }, orderBy: { date: 'desc' } })
    : await prisma.matchResult.findFirst({ where: { id: matchIdParam, clubId: club.id } })
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  let logoDataUri: string | null = null
  if (club.logoUrl) {
    try {
      const res = await fetch(club.logoUrl)
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        const contentType = res.headers.get('content-type') ?? 'image/png'
        logoDataUri = `data:${contentType};base64,${buf.toString('base64')}`
      }
    } catch {
      // Logo indisponible : le composer Logo gère déjà l'absence proprement (repli texte).
    }
  }

  const composition = composeMatchResult({
    content: {
      clubName: club.name,
      opponent: match.opponent,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      isHome: match.isHome,
      competition: match.competition,
      date: match.date.toISOString(),
    },
    brandKit: resolveBrandKit(club),
    family,
    seed: `${match.id}:${seed}`,
    logoDataUri,
  })

  const png = await renderCompositionToPng(composition)
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  })
}
