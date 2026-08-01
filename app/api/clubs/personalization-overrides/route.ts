import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/** Liste les overrides de personnalisation déjà enregistrés pour le club authentifié — un par type au maximum. */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const overrides = await prisma.clubPersonalizationOverride.findMany({
    where: { clubId: club.id },
    select: { postType: true, voiceOverride: true, customInstructions: true, signaturePhrase: true, updatedAt: true },
  })

  return NextResponse.json({ overrides })
}
