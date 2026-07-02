import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Crée (ou met à jour) le résultat d'une rencontre interclub, avec le détail
// des simples/doubles. Alimente ensuite la section Résultats + la génération.

type ScoreDetailIn = { player: string; opponent: string; score: string; won: boolean; type: 'SIMPLE' | 'DOUBLE' }

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const {
    matchResultId,
    teamName,
    opponent,
    division = '',
    round = '',
    date,
    homeAway = 'DOMICILE',
    clubScore,
    oppScore,
    scoreDetail = [],
  } = body as {
    matchResultId?: string
    teamName?: string
    opponent?: string
    division?: string
    round?: string
    date?: string
    homeAway?: 'DOMICILE' | 'EXTERIEUR'
    clubScore?: number
    oppScore?: number
    scoreDetail?: ScoreDetailIn[]
  }

  if (!opponent || clubScore === undefined || oppScore === undefined) {
    return NextResponse.json({ error: 'Adversaire et score global requis.' }, { status: 400 })
  }

  const isHome = homeAway === 'DOMICILE'
  const data = {
    clubId: club.id,
    date: date ? new Date(date) : new Date(),
    opponent,
    homeScore: Number(clubScore),
    awayScore: Number(oppScore),
    isHome,
    sport: club.sport,
    matchType: 'INTERCLUB' as const,
    teamName: teamName || club.name,
    homeAway: homeAway as 'DOMICILE' | 'EXTERIEUR',
    scoreDetail: (scoreDetail ?? []) as unknown as never,
    globalScore: `${clubScore}-${oppScore}`,
    division: division || null,
    round: round || null,
  }

  const match = matchResultId
    ? await prisma.matchResult.update({ where: { id: matchResultId, clubId: club.id }, data })
    : await prisma.matchResult.create({ data })

  return NextResponse.json({ matchResultId: match.id })
}
