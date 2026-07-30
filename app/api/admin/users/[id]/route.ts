import { NextRequest, NextResponse } from 'next/server'

import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/adminAudit'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const userId = params.id

  const supabaseAdmin = createAdminClient()
  const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId)

  await prisma.$transaction(async (tx) => {
    await tx.organizationMember.deleteMany({ where: { userId } })
    await tx.club.deleteMany({ where: { userId } })
  })

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) {
    await logAdminAction({
      admin, action: 'user.delete', resourceType: 'user', resourceId: userId,
      result: 'failure', errorMessage: error.message,
    })
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  await logAdminAction({
    admin, action: 'user.delete', resourceType: 'user', resourceId: userId,
    beforeValue: { email: targetUser.user?.email ?? null },
  })

  return NextResponse.json({ ok: true })
}
