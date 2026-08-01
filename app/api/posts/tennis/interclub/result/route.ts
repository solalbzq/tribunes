import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { interclubResultPromptAll, ScoreDetail } from '@/lib/prompts/tennis-posts'
import { padelInterclubResultPromptAll, PadelScoreDetail } from '@/lib/prompts/padel-posts'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'
import { checkAiQuota, quotaExceededResponse } from '@/lib/quota'
import { resolveInitialStatus, runAutomationSideEffects } from '@/lib/automation'
import { buildPersonalizationPrefix, validateOneTimeInstructions } from '@/lib/personalization'
import { checkBannedWordsAcrossPlatforms } from '@/lib/bannedWords'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const { matchResultId, platforms = ['instagram', 'facebook', 'whatsapp'], regenerate = false, tone, mvpName, customInstructions } = await req.json()
  if (!matchResultId) return NextResponse.json({ error: 'matchResultId manquant' }, { status: 400 })

  const match = await prisma.matchResult.findUnique({
    where: { id: matchResultId, clubId: club.id },
  })
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  // Réutilisation : si des posts existent déjà pour ce match, on les renvoie
  // sans rappeler l'IA (sauf demande explicite de régénération).
  if (!regenerate) {
    const existing = await prisma.generatedPost.findMany({
      where: { matchId: match.id, postType: 'INTERCLUB_RESULT' },
    })
    if (existing.length > 0) {
      const posts = Object.fromEntries(existing.map(p => [p.platform, p.content]))
      return NextResponse.json({ posts, matchId: match.id, cached: true })
    }
  }

  // Quota vérifié après le cache : relire des posts existants reste gratuit.
  const quota = await checkAiQuota(club)
  if (!quota.allowed) return quotaExceededResponse(quota)

  const sport = match.sport ?? club.sport
  const isPadel = sport === 'Padel' || sport === 'PADEL'
  const globalScore = match.globalScore ?? `${match.homeScore}-${match.awayScore}`
  const homeAway = (match.homeAway ?? 'DOMICILE') as 'DOMICILE' | 'EXTERIEUR'
  const scoreDetail = (match.scoreDetail ?? []) as ScoreDetail[] | PadelScoreDetail[]
  const voice = tone || club.contentTone

  const oneTimeInstructions = validateOneTimeInstructions(customInstructions)
  if (!oneTimeInstructions.ok) return NextResponse.json({ error: oneTimeInstructions.error }, { status: 400 })

  // Un seul appel IA pour les 3 plateformes.
  const prompt = buildPersonalizationPrefix(club, oneTimeInstructions.value) + (isPadel
    ? padelInterclubResultPromptAll(
        club.name, match.teamName ?? club.name, match.opponent, globalScore,
        match.division ?? '', match.round ?? '', homeAway, scoreDetail as PadelScoreDetail[], voice, mvpName || undefined
      )
    : interclubResultPromptAll(
        club.name, match.teamName ?? club.name, match.opponent, globalScore,
        match.division ?? '', match.round ?? '', homeAway, scoreDetail as ScoreDetail[], voice, mvpName || undefined
      ))

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })
  await logAiUsage(club.id, completion, 'gpt-4o', { route: 'interclub/result' })

  const all = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const requested = platforms as Array<'instagram' | 'facebook' | 'whatsapp'>
  const posts: Record<string, string> = {}
  for (const platform of requested) posts[platform] = all[platform]

  const initialStatus = await resolveInitialStatus(club)
  const bannedWords = checkBannedWordsAcrossPlatforms(posts, club.bannedWords)

  // Remplace les anciens posts de ce match pour éviter les doublons.
  await prisma.generatedPost.deleteMany({ where: { matchId: match.id, postType: 'INTERCLUB_RESULT' } })
  const created = await prisma.$transaction(
    Object.entries(posts).map(([platform, content]) =>
      prisma.generatedPost.create({
        data: {
          matchId: match.id,
          platform,
          content,
          postType: 'INTERCLUB_RESULT',
          status: initialStatus,
        },
      })
    )
  )
  await runAutomationSideEffects(club, created, { forceReview: bannedWords.hasViolation })

  return NextResponse.json({
    posts, matchId: match.id,
    bannedWordsWarning: bannedWords.hasViolation ? bannedWords.violationsByPlatform : null,
  })
}
