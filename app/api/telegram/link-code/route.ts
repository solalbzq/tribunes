import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { telegramConfigured } from '@/lib/telegram'

function generateCode(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!telegramConfigured() || !process.env.TELEGRAM_BOT_USERNAME) {
    return NextResponse.json({ error: "L'intégration Telegram n'est pas configurée." }, { status: 503 })
  }

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const code = generateCode()
  await prisma.club.update({ where: { id: club.id }, data: { telegramLinkCode: code } })

  return NextResponse.json({ linkUrl: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${code}` })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  await prisma.club.update({
    where: { id: club.id },
    data: { telegramChatId: null, telegramLinkCode: null },
  })

  return NextResponse.json({ ok: true })
}
