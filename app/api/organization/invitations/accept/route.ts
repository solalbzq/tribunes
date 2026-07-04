import { NextResponse } from 'next/server'

import { setActiveOrganizationId } from '@/lib/active-organization'
import { acceptOrganizationInvitation } from '@/lib/organization-invitations'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const origin = url.origin

  if (!token) {
    return NextResponse.redirect(`${origin}/account?invite_error=missing`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?invite=${encodeURIComponent(token)}&next=%2Faccount`)
  }

  const result = await acceptOrganizationInvitation(token, user)
  if (!result.ok) {
    return NextResponse.redirect(`${origin}/account?invite_error=${encodeURIComponent(result.error)}`)
  }

  setActiveOrganizationId(result.orgId)

  return NextResponse.redirect(`${origin}/account?invite=accepted`)
}
