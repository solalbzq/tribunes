import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { logAiUsage } from '@/lib/usage'

// Lecture d'une capture d'écran Ten'Up (résultats ou programme) par GPT-4o vision.
// C'est le contournement de Queue-it : l'utilisateur photographie sa page Ten'Up,
// l'IA en extrait des données structurées.

const SYSTEM = `Tu es un extracteur de données de tennis/padel à partir de captures d'écran de la plateforme FFT "Ten'Up".
Analyse l'image et renvoie UNIQUEMENT un JSON valide, sans texte autour, avec ce schéma :
{
  "kind": "resultat" | "programme",          // résultat de rencontre OU programme à venir
  "teamName": string,                         // nom de l'équipe du club (ex: "TC BEAUVOISIN 2")
  "opponent": string,                          // équipe adverse
  "division": string,                          // division/championnat si visible, sinon ""
  "date": string,                              // date lisible (ex: "dimanche 19 avril 2026") ou ""
  "homeAway": "DOMICILE" | "EXTERIEUR" | "",  // si déductible
  "globalScore": string,                       // score global "X-Y" (résultat), sinon ""
  "details": [                                 // détail des matchs (résultat) — [] si programme
    { "player": string, "opponent": string, "score": string, "won": boolean, "type": "SIMPLE" | "DOUBLE" }
  ],
  "matches": [                                 // rencontres à venir (programme) — [] si résultat
    { "teamName": string, "opponent": string, "day": string, "time": string, "division": string }
  ]
}
Règles :
- N'invente aucune donnée : si une info n'est pas visible, mets "" ou [].
- "won" = true si le joueur/la paire du club a gagné ce match.
- Déduis "kind" du contenu (scores finaux => "resultat" ; horaires/dates futures sans score => "programme").`

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const form = await req.formData()
  const image = form.get('image') as File | null
  const hint = (form.get('hint') as string) || '' // 'resultat' | 'programme' | ''
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
            { type: 'text', text: `Nom du club : "${club.name}".${hint ? ` Type attendu : ${hint}.` : ''} Extrais les données de cette capture Ten'Up.` },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
    })
    await logAiUsage(club.id, completion, 'gpt-4o', { route: 'tennis/ingest' })

    const raw = completion.choices[0].message.content ?? '{}'
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: "Lecture de la capture impossible, réessaie avec une image plus nette." }, { status: 422 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[tennis/ingest]', err)
    return NextResponse.json({ error: (err as Error).message ?? "Échec de l'analyse" }, { status: 502 })
  }
}
