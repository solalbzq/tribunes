import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForLongLivedToken, debugTokenInfo } from '@/lib/social/meta'
import { syncSocialConnectionsForClub } from '@/lib/social/connection-sync'
import { encryptSecret } from '@/lib/social/token-crypto'

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
    const res = NextResponse.redirect(`${settingsUrl}&social=badstate`)
    res.cookies.delete('meta_oauth_state')
    return res
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${base}/login`)

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.redirect(`${base}/dashboard?social=noclub`)

  try {
    const { token, expiresIn } = await exchangeCodeForLongLivedToken(code)
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Token utilisateur long-lived conservé (chiffré) pour permettre au cron
    // social-token-refresh de le prolonger via fb_exchange_token avant expiration,
    // sans repasser par tout le flux OAuth (cf. lib/social/meta.ts::refreshLongLivedToken).
    await prisma.club.update({
      where: { id: club.id },
      data: { metaUserAccessToken: encryptSecret(token), metaUserTokenExpiresAt: expiresAt },
    })

    const { connectedCount } = await syncSocialConnectionsForClub(club.id, token, expiresAt)

    if (connectedCount === 0) {
      // DEBUG TEMPORAIRE — le détail reste côté serveur uniquement (jamais dans
      // l'URL de redirection : historique navigateur, logs proxy, referrer).
      const debug = await debugTokenInfo(token)
      console.error('[social/meta/callback] DEBUG nopages:', JSON.stringify(debug, null, 2))
      const res = NextResponse.redirect(`${settingsUrl}&social=nopages`)
      res.cookies.delete('meta_oauth_state')
      return res
    }

    const res = NextResponse.redirect(`${settingsUrl}&social=connected`)
    res.cookies.delete('meta_oauth_state')
    return res
  } catch (err) {
    console.error('[social/meta/callback]', err)
    const res = NextResponse.redirect(`${settingsUrl}&social=error`)
    res.cookies.delete('meta_oauth_state')
    return res
  }
}
