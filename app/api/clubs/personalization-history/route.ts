import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { listPersonalizationHistory } from '@/lib/services/personalizationHistory'

/** Historique des sauvegardes de l'identité générale du club authentifié, du plus récent au plus ancien. */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const history = await listPersonalizationHistory(club.id)
  return NextResponse.json({ history })
}
