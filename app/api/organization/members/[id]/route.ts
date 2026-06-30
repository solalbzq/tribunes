import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getOwnerMembership(userId: string, targetMemberId: string) {
  const target = await prisma.organizationMember.findUnique({ where: { id: targetMemberId } })
  if (!target) return { target: null, callerMembership: null }

  const callerMembership = await prisma.organizationMember.findFirst({
    where: { userId, orgId: target.orgId, role: 'OWNER' },
  })

  return { target, callerMembership }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = await request.json()
  if (role !== 'OWNER' && role !== 'MEMBER') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { target, callerMembership } = await getOwnerMembership(user.id, params.id)
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (!callerMembership) return NextResponse.json({ error: 'Not an owner' }, { status: 403 })

  if (target.role === 'OWNER' && role === 'MEMBER') {
    const ownerCount = await prisma.organizationMember.count({ where: { orgId: target.orgId, role: 'OWNER' } })
    if (ownerCount <= 1) {
      return NextResponse.json({ error: 'Au moins un propriétaire est requis dans la structure.' }, { status: 400 })
    }
  }

  const updated = await prisma.organizationMember.update({ where: { id: params.id }, data: { role } })
  return NextResponse.json(updated)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { target, callerMembership } = await getOwnerMembership(user.id, params.id)
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (!callerMembership) return NextResponse.json({ error: 'Not an owner' }, { status: 403 })

  if (target.role === 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({ where: { orgId: target.orgId, role: 'OWNER' } })
    if (ownerCount <= 1) {
      return NextResponse.json({ error: 'Au moins un propriétaire est requis dans la structure.' }, { status: 400 })
    }
  }

  await prisma.organizationMember.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
