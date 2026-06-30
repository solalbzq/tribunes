import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { interclubResultPrompt, ScoreDetail } from '@/lib/prompts/tennis-posts'
import { padelInterclubResultPrompt, PadelScoreDetail } from '@/lib/prompts/padel-posts'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const { matchResultId, platforms = ['instagram', 'facebook', 'whatsapp'] } = await req.json()
  if (!matchResultId) return NextResponse.json({ error: 'matchResultId manquant' }, { status: 400 })

  const match = await prisma.matchResult.findUnique({
    where: { id: matchResultId, clubId: club.id },
  })
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  const sport = match.sport ?? club.sport
  const isPadel = sport === 'Padel' || sport === 'PADEL'
  const globalScore = match.globalScore ?? `${match.homeScore}-${match.awayScore}`
  const homeAway = (match.homeAway ?? 'DOMICILE') as 'DOMICILE' | 'EXTERIEUR'
  const scoreDetail = (match.scoreDetail ?? []) as ScoreDetail[] | PadelScoreDetail[]

  const posts: Record<string, string> = {}

  for (const platform of platforms as Array<'instagram' | 'facebook' | 'whatsapp'>) {
    const prompt = isPadel
      ? padelInterclubResultPrompt(
          platform, club.name,
          match.teamName ?? club.name,
          match.opponent,
          globalScore,
          match.division ?? '',
          match.round ?? '',
          homeAway,
          scoreDetail as PadelScoreDetail[]
        )
      : interclubResultPrompt(
          platform, club.name,
          match.teamName ?? club.name,
          match.opponent,
          globalScore,
          match.division ?? '',
          match.round ?? '',
          homeAway,
          scoreDetail as ScoreDetail[]
        )

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1200,
    })
    posts[platform] = res.choices[0].message.content ?? ''
  }

  // Save posts
  await prisma.generatedPost.createMany({
    data: Object.entries(posts).map(([platform, content]) => ({
      matchId: match.id,
      platform,
      content,
      postType: 'INTERCLUB_RESULT',
      status: 'DRAFT',
    })),
  })

  return NextResponse.json({ posts, matchId: match.id })
}
