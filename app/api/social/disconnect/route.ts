import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const { id, all } = await req.json().catch(() => ({}))

  if (all) {
    await prisma.socialConnection.deleteMany({ where: { clubId: club.id } })
    return NextResponse.json({ ok: true })
  }
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  await prisma.socialConnection.deleteMany({ where: { id, clubId: club.id } })
  return NextResponse.json({ ok: true })
}
