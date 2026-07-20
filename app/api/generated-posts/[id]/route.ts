import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) {
    return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : undefined
  const reject = body?.status === 'REJECTED'

  if (content === undefined && !reject) {
    return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 })
  }

  // Éditable tant qu'aucune publication n'a été tentée : brouillon (mode manuel)
  // ou en attente de validation (mode Auto + validation, avant approbation).
  const draft = await prisma.generatedPost.findFirst({
    where: {
      id: params.id,
      status: { in: ['DRAFT', 'PENDING_REVIEW'] },
      OR: [
        { match: { clubId: club.id } },
        { tournamentSchedule: { clubId: club.id } },
        { weeklySchedule: { clubId: club.id } },
        { seasonRecap: { clubId: club.id } },
      ],
    },
    select: { id: true },
  })

  if (!draft) {
    return NextResponse.json({ error: 'Brouillon introuvable' }, { status: 404 })
  }

  const updated = await prisma.generatedPost.update({
    where: { id: draft.id },
    data: reject
      ? { status: 'REJECTED' }
      : { content },
    select: {
      id: true,
      content: true,
      platform: true,
      status: true,
      postType: true,
    },
  })

  return NextResponse.json(updated)
}
