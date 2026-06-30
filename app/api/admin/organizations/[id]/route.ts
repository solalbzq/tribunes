import { NextRequest, NextResponse } from 'next/server'

import { ensureAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_PLANS = ['FREE', 'PRO', 'STRUCTURE']

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      members: { orderBy: { createdAt: 'asc' } },
      clubs: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!org) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const supabaseAdmin = createAdminClient()
  const members = await Promise.all(
    org.members.map(async (member) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(member.userId)
      return { ...member, email: data.user?.email ?? null }
    }),
  )

  return NextResponse.json({ ...org, members })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const data: { plan?: string; suspended?: boolean } = {}

  if (body.plan !== undefined) {
    if (!VALID_PLANS.includes(body.plan)) {
      return NextResponse.json({ message: 'Invalid plan' }, { status: 400 })
    }
    data.plan = body.plan
  }

  if (body.suspended !== undefined) {
    data.suspended = Boolean(body.suspended)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: 'Nothing to update' }, { status: 400 })
  }

  const org = await prisma.organization.update({ where: { id: params.id }, data })
  return NextResponse.json(org)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const mode = request.nextUrl.searchParams.get('mode') === 'cascade' ? 'cascade' : 'detach'

  await prisma.$transaction(async (tx) => {
    if (mode === 'cascade') {
      await tx.club.deleteMany({ where: { orgId: params.id } })
    } else {
      await tx.club.updateMany({ where: { orgId: params.id }, data: { orgId: null } })
    }
    await tx.organization.delete({ where: { id: params.id } })
  })

  return NextResponse.json({ ok: true, mode })
}
