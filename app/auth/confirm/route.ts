import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Handles the token_hash links from Supabase auth emails (password recovery,
// email confirmation, etc.) using the server-side verifyOtp flow. This is more
// robust than the PKCE code exchange for email links because it doesn't depend
// on a code verifier being present in the same browser.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Invalid or expired link → send them back to the reset page, which will show
  // the "lien invalide ou expiré" state since no session was established.
  return NextResponse.redirect(`${origin}/reset-password?error=expired`)
}
