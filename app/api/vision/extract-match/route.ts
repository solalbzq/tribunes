import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { logAiUsage } from '@/lib/usage'
import { checkAiQuota, quotaExceededResponse } from '@/lib/quota'

// Lecture d'une capture d'écran de résultat par GPT-4o vision (site de ligue,
// message d'un coéquipier, feuille de match, réseau social...) — généralisation,
// pour tous les sports, de la même technique déjà utilisée par
// app/api/tennis/ingest/route.ts (propre à Ten'Up et au format sets/joueurs).

const SYSTEM = `Tu es un extracteur de données de résultat sportif à partir d'une capture d'écran (site de ligue/fédération, message, feuille de match, réseau social...).
Analyse l'image et renvoie UNIQUEMENT un JSON valide, sans texte autour, avec ce schéma :
{
  "opponent": string,                    // nom de l'équipe adverse, "" si non visible
  "clubScore": number | null,            // score du club dont le nom est donné, null si non visible
  "opponentScore": number | null,        // score de l'adversaire, null si non visible
  "isHome": boolean | null,              // true si le club jouait à domicile, null si non déductible
  "competition": string,                 // championnat/coupe si visible, sinon ""
  "date": string                         // date au format YYYY-MM-DD si déductible, sinon ""
}
Règles :
- N'invente aucune donnée : si une info n'est pas visible, mets null ou "".`

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const quota = await checkAiQuota(club)
  if (!quota.allowed) return quotaExceededResponse(quota)

  const form = await req.formData()
  const image = form.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'Capture manquante' }, { status: 400 })
  if (image.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image trop lourde (max 8 Mo)' }, { status: 400 })

  const base64 = Buffer.from(await image.arrayBuffer()).toString('base64')
  const dataUrl = `data:${image.type || 'image/png'};base64,${base64}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Nom du club : "${club.name}". Extrais les données de résultat de cette capture d'écran.` },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
    })
    await logAiUsage(club.id, completion, 'gpt-4o', { route: 'vision/extract-match' })

    const raw = completion.choices[0].message.content ?? '{}'
    let parsed: {
      opponent?: string
      clubScore?: number | null
      opponentScore?: number | null
      isHome?: boolean | null
      competition?: string
      date?: string
    }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: "Lecture de la capture impossible, réessaie avec une image plus nette." }, { status: 422 })
    }

    const isHome = parsed.isHome ?? true
    const homeScore = isHome ? parsed.clubScore : parsed.opponentScore
    const awayScore = isHome ? parsed.opponentScore : parsed.clubScore

    return NextResponse.json({
      data: {
        opponent: parsed.opponent || '',
        homeScore: homeScore ?? null,
        awayScore: awayScore ?? null,
        isHome,
        competition: parsed.competition || '',
        date: parsed.date || '',
      },
    })
  } catch (err) {
    console.error('[vision/extract-match]', err)
    return NextResponse.json({ error: (err as Error).message ?? "Échec de l'analyse" }, { status: 502 })
  }
}
