import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkAutomationAllowed, AUTOMATION_MODES } from '@/lib/automation'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const { automationMode } = await req.json()
  if (!AUTOMATION_MODES.includes(automationMode)) {
    return NextResponse.json({ error: 'Mode invalide' }, { status: 400 })
  }

  if (automationMode !== 'MANUAL') {
    const allowed = await checkAutomationAllowed(club)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Les modes automatiques nécessitent le plan Pro.', code: 'PLAN_REQUIRED' },
        { status: 403 }
      )
    }
  }

  const updated = await prisma.club.update({
    where: { id: club.id },
    data: { automationMode },
  })

  return NextResponse.json({ automationMode: updated.automationMode })
}
