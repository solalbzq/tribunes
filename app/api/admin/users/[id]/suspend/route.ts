import { NextRequest, NextResponse } from 'next/server'

import { ensureAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { banned } = await request.json()

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.auth.admin.updateUserById(params.id, {
    ban_duration: banned ? '876000h' : 'none',
  })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, banned: Boolean(banned) })
}
