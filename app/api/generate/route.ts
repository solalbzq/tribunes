import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { getSportVocab, formatExtraForPrompt } from '@/lib/sports'
import { splitPlatformPosts } from '@/lib/prompts/splitPlatforms'
import { logAiUsage } from '@/lib/usage'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

  const { opponent, homeScore, awayScore, isHome, competition, date, notes, extraData } = await req.json()
  if (!opponent || homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

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

  const prompt = `Tu es le responsable communication du club de ${club.sport} "${club.name}".
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

  const match = await prisma.matchResult.create({
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
          { platform: 'instagram', content: posts.instagram },
          { platform: 'facebook', content: posts.facebook },
          { platform: 'whatsapp', content: posts.whatsapp },
        ],
      },
    },
    include: { posts: true },
  })

  return NextResponse.json({ match, posts })
}

function getVocabHints(sport: string): string {
  switch (sport) {
    case 'Football':
      return `- Un but = "but" (pas "point")
- Deux périodes de 45 minutes = "première mi-temps", "deuxième mi-temps"
- Penalty = "penalty" ou "tir au but"
- Gardien de but = "gardien"
- Carte jaune/rouge, corner, hors-jeu`

    case 'Tennis':
      return `- Une manche = "set"
- Un jeu dans un set = "jeu"
- Point décisif dans un jeu = "jeu décisif" ou "tie-break"
- Zéro = "zéro" ou "love"
- Servir un ace, faire un break, défendre son service
- En interclubs : "rencontre", "équipe", "capitaine"`

    case 'Basketball':
      return `- Un panier vaut 2 points, à 3 points derrière la ligne
- Quart-temps (Q1, Q2, Q3, Q4), prolongation (OT)
- Rebond offensif/défensif, passe décisive, interception
- Lay-up, dunk, shoot à mi-distance
- "Poster" une action = la mettre en valeur`

    case 'Volleyball':
      return `- On joue en sets (et non en manches ou mi-temps)
- Gagner un set = atteindre 25 points (15 au tie-break)
- Ace = service direct gagnant
- Smash ou attaque, contre (block), réception, passe
- Le libéro joue en défense
- Score final en sets : "3 sets à 2"`

    case 'Handball':
      return `- Un but = "but" (jamais "panier" ou "point")
- Deux mi-temps de 30 minutes
- Gardien, tir de 7 mètres, jet franc
- Pivot, ailier, arrière, demi-centre
- "Tir en suspension", "contre-attaque"`

    default:
      return ''
  }
}
