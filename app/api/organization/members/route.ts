import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 404 })

  const members = await prisma.organizationMember.findMany({
    where: { orgId: membership.orgId },
    orderBy: { createdAt: 'asc' },
  })

  const supabaseAdmin = createAdminClient()
  const resolved = await Promise.all(
    members.map(async (member) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(member.userId)
      return {
        id: member.id,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
        email: data.user?.email ?? null,
      }
    }),
  )

  return NextResponse.json(resolved)
}
