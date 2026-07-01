import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAuthUrl, metaConfigured } from '@/lib/social/meta'

export async function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  if (!metaConfigured()) {
    return NextResponse.redirect(`${base}/dashboard?social=notconfigured`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${base}/login`)

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.redirect(`${base}/dashboard?social=noclub`)

  const state = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(getAuthUrl(state))
  res.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
