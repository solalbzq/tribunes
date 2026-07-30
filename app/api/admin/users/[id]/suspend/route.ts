import { NextRequest, NextResponse } from 'next/server'

import { getAdminUser } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/adminAudit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { banned } = await request.json()

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.auth.admin.updateUserById(params.id, {
    ban_duration: banned ? '876000h' : 'none',
  })

  if (error) {
    await logAdminAction({
      admin, action: banned ? 'user.suspend' : 'user.unsuspend', resourceType: 'user', resourceId: params.id,
      result: 'failure', errorMessage: error.message,
    })
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  await logAdminAction({
    admin, action: banned ? 'user.suspend' : 'user.unsuspend', resourceType: 'user', resourceId: params.id,
    afterValue: { banned: Boolean(banned) },
  })

  return NextResponse.json({ ok: true, banned: Boolean(banned) })
}
