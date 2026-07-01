import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForLongLivedToken, getPagesWithInstagram } from '@/lib/social/meta'

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const settingsUrl = `${base}/dashboard?tab=reseaux`
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) return NextResponse.redirect(`${settingsUrl}&social=denied`)
  if (!code || !state) return NextResponse.redirect(`${settingsUrl}&social=error`)

  // Vérif CSRF via le cookie state
  const cookieState = req.cookies.get('meta_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${settingsUrl}&social=badstate`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${base}/login`)

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.redirect(`${base}/dashboard?social=noclub`)

  try {
    const { token, expiresIn } = await exchangeCodeForLongLivedToken(code)
    const pages = await getPagesWithInstagram(token)
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    let count = 0
    for (const page of pages) {
      // Connexion Facebook (Page)
      await prisma.socialConnection.upsert({
        where: { clubId_provider_providerAccountId: { clubId: club.id, provider: 'facebook', providerAccountId: page.pageId } },
        update: { accountName: page.pageName, accessToken: page.pageToken, avatarUrl: page.avatarUrl, igUserId: page.igUserId, tokenExpiresAt: expiresAt },
        create: { clubId: club.id, provider: 'facebook', providerAccountId: page.pageId, accountName: page.pageName, accessToken: page.pageToken, avatarUrl: page.avatarUrl, igUserId: page.igUserId, tokenExpiresAt: expiresAt },
      })
      count++
      // Connexion Instagram si compte business lié
      if (page.igUserId) {
        await prisma.socialConnection.upsert({
          where: { clubId_provider_providerAccountId: { clubId: club.id, provider: 'instagram', providerAccountId: page.igUserId } },
          update: { accountName: page.igUsername ?? page.pageName, accessToken: page.pageToken, tokenExpiresAt: expiresAt, meta: { pageId: page.pageId } },
          create: { clubId: club.id, provider: 'instagram', providerAccountId: page.igUserId, accountName: page.igUsername ?? page.pageName, accessToken: page.pageToken, tokenExpiresAt: expiresAt, meta: { pageId: page.pageId } },
        })
        count++
      }
    }

    const res = NextResponse.redirect(`${settingsUrl}&social=${count > 0 ? 'connected' : 'nopages'}`)
    res.cookies.delete('meta_oauth_state')
    return res
  } catch (err) {
    console.error('[social/meta/callback]', err)
    return NextResponse.redirect(`${settingsUrl}&social=error`)
  }
}
