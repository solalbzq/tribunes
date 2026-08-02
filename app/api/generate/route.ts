import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { getSportVocab, formatExtraForPrompt, getVocabHints } from '@/lib/sports'
import { getVoiceInstruction } from '@/lib/voice'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'
import { checkAiQuota, quotaExceededResponse } from '@/lib/quota'
import { resolveInitialStatus, runAutomationSideEffects } from '@/lib/automation'
import { validateOneTimeInstructions, resolvePersonalization } from '@/lib/personalization'
import { getPersonalizationOverride } from '@/lib/services/personalizationOverride'
import { deletePostsForRegenerate } from '@/lib/services/postGeneration'
import { checkBannedWordsAcrossPlatforms } from '@/lib/bannedWords'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const quota = await checkAiQuota(club)
  if (!quota.allowed) return quotaExceededResponse(quota)

  const { opponent, homeScore, awayScore, isHome, competition, date, notes, extraData, tone, mvpName, customInstructions, matchId, regenerate } = await req.json()
  if (!opponent || homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const oneTimeInstructions = validateOneTimeInstructions(customInstructions)
  if (!oneTimeInstructions.ok) return NextResponse.json({ error: oneTimeInstructions.error }, { status: 400 })
  const typeOverride = await getPersonalizationOverride(club.id, 'MATCH_RESULT')
  const { voice, prefix } = resolvePersonalization({
    club, postType: 'MATCH_RESULT', typeOverride,
    requestOverride: { voiceOverride: tone, oneTimeInstructions: oneTimeInstructions.value },
  })

  const clubScore = isHome ? homeScore : awayScore
  const opponentScore = isHome ? awayScore : homeScore
  const vocab = getSportVocab(club.sport)
  const result =
    clubScore > opponentScore ? vocab.winWord :
    clubScore < opponentScore ? vocab.lossWord :
    vocab.drawWord

  const dateStr = date
    ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  const scoreDisplay = (() => {
    if (club.sport === 'Volleyball') return `${clubScore} set${clubScore > 1 ? 's' : ''} à ${opponentScore}`
    if (club.sport === 'Tennis') return `${clubScore} à ${opponentScore}`
    return `${clubScore} - ${opponentScore}`
  })()

  const extraLines = extraData ? formatExtraForPrompt(club.sport, extraData) : ''
  const voiceInstruction = getVoiceInstruction(voice)
  const mvpInstruction = mvpName
    ? `Joueur/joueuse du match à mettre en avant : ${mvpName}. Cite-le/la nommément et valorise sa performance dans au moins un des posts.`
    : ''

  const prompt = prefix + `Tu es le responsable communication du club de ${club.sport} "${club.name}".
Rédige des posts pour annoncer ce résultat :

- Sport : ${club.sport} ${vocab.emoji}
- Adversaire : ${opponent}
- Score final : ${club.name} ${scoreDisplay} ${opponent} → ${result}
- ${competition ? `Compétition : ${competition}` : 'Match amical'}
- ${dateStr ? `Date : ${dateStr}` : ''}${extraLines}
${notes ? `- Contexte additionnel : ${notes}` : ''}

Vocabulaire sport-spécifique à utiliser pour le ${club.sport} :
${getVocabHints(club.sport)}

${vocab.keyStats ? `Tu peux aussi : ${vocab.keyStats}.` : ''}
${voiceInstruction ? `\n${voiceInstruction}\n` : ''}
${mvpInstruction ? `\n${mvpInstruction}\n` : ''}
Génère exactement 3 posts, UN par plateforme, séparés par "---PLATFORM---" :

1. Instagram : dynamique, avec des emojis, 3-4 hashtags pertinents pour le ${club.sport}, ton célébration ou fair-play selon résultat, 80-120 mots
2. Facebook : narratif et communautaire, chaleureux, sans hashtags, 100-150 mots
3. WhatsApp : court et percutant, pour groupe de supporters, avec emojis, 30-50 mots

Format exact attendu :
[INSTAGRAM]
(texte)
---PLATFORM---
[FACEBOOK]
(texte)
---PLATFORM---
[WHATSAPP]
(texte)`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })
  await logAiUsage(club.id, completion, 'gpt-4o', { route: 'generate' })

  const posts = splitPlatformPosts(completion.choices[0].message.content ?? '')
  const bannedWords = checkBannedWordsAcrossPlatforms(posts, club.bannedWords)
  const initialStatus = await resolveInitialStatus(club, { forceReview: bannedWords.hasViolation })

  let match: Awaited<ReturnType<typeof prisma.matchResult.findUniqueOrThrow>> & { posts: Array<{ id: string; platform: string; content: string; imageUrl: string | null }> }

  if (matchId && regenerate) {
    const existing = await prisma.matchResult.findUnique({ where: { id: matchId, clubId: club.id } })
    if (!existing) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
    await deletePostsForRegenerate('MATCH_RESULT', matchId)
    match = await prisma.matchResult.update({
      where: { id: matchId },
      data: {
        posts: {
          create: [
            { platform: 'instagram', content: posts.instagram, status: initialStatus, postType: 'MATCH_RESULT' },
            { platform: 'facebook', content: posts.facebook, status: initialStatus, postType: 'MATCH_RESULT' },
          ],
        },
      },
      include: { posts: true },
    })
  } else {
    match = await prisma.matchResult.create({
      data: {
        clubId: club.id,
        date: date ? new Date(date) : new Date(),
        opponent,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        isHome: Boolean(isHome),
        competition: competition || null,
        notes: notes || null,
        extraData: extraData ?? undefined,
        posts: {
          create: [
            { platform: 'instagram', content: posts.instagram, status: initialStatus },
            { platform: 'facebook', content: posts.facebook, status: initialStatus },
          ],
        },
      },
      include: { posts: true },
    })
  }

  await runAutomationSideEffects(club, match.posts, { forceReview: bannedWords.hasViolation })

  return NextResponse.json({
    match, posts,
    bannedWordsWarning: bannedWords.hasViolation ? bannedWords.violationsByPlatform : null,
  })
}
