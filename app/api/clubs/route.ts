import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const supabase = createClient()
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, sport, primaryColor, secondaryColor, visualConfig, tennisVisualConfig, tenupUrl } = await req.json()
  if (!name || !sport) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const data = {
    name, sport,
    primaryColor: primaryColor ?? '#1a1a2e',
    secondaryColor: secondaryColor ?? '#e94560',
    ...(visualConfig !== undefined ? { visualConfig } : {}),
    ...(tennisVisualConfig !== undefined ? { tennisVisualConfig } : {}),
    ...(tenupUrl !== undefined ? { tenupUrl: tenupUrl || null } : {}),
  }

  const club = await prisma.club.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  })

  return NextResponse.json(club)
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  return NextResponse.json(club)
}
