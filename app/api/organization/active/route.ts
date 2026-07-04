import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { setActiveOrganizationId } from '@/lib/active-organization'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await request.json() as { orgId?: string }
  if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Organisation introuvable.' }, { status: 404 })

  setActiveOrganizationId(orgId)

  return NextResponse.json({ ok: true })
}
