import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { CLUB_VOICES } from '@/lib/voice'

export async function POST(req: Request) {
  const supabase = createClient()
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    name, sport, primaryColor, secondaryColor, visualConfig, tennisVisualConfig, postVisualConfigs,
    tenupUrl, contentTone, customInstructions, signaturePhrase, bannedWords,
  } = await req.json()
  if (!name || !sport) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const data = {
    name, sport,
    ...(primaryColor !== undefined ? { primaryColor } : {}),
    ...(secondaryColor !== undefined ? { secondaryColor } : {}),
    ...(visualConfig !== undefined ? { visualConfig } : {}),
    ...(tennisVisualConfig !== undefined ? { tennisVisualConfig } : {}),
    ...(postVisualConfigs !== undefined ? { postVisualConfigs } : {}),
    ...(tenupUrl !== undefined ? { tenupUrl: tenupUrl || null } : {}),
    ...(contentTone !== undefined && CLUB_VOICES.includes(contentTone) ? { contentTone } : {}),
    ...(customInstructions !== undefined ? { customInstructions: customInstructions || null } : {}),
    ...(signaturePhrase !== undefined ? { signaturePhrase: signaturePhrase || null } : {}),
    ...(bannedWords !== undefined ? { bannedWords: bannedWords || null } : {}),
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
