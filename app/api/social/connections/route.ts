import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { metaConfigured } from '@/lib/social/meta'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const connections = await prisma.socialConnection.findMany({
    where: { clubId: club.id },
    select: { id: true, provider: true, providerAccountId: true, accountName: true, avatarUrl: true, tokenExpiresAt: true },
    orderBy: { provider: 'asc' },
  })

  return NextResponse.json({ configured: metaConfigured(), connections })
}
