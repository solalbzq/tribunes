import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { ensureAdmin, getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/adminAudit'

const EDITABLE_FIELDS = ['name', 'sport', 'primaryColor', 'secondaryColor', 'logoUrl', 'suspended'] as const

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const club = await prisma.club.findUnique({
    where: { id: params.id },
    include: {
      org: { select: { id: true, name: true, plan: true } },
      _count: { select: { matches: true } },
      matches: {
        orderBy: { date: 'desc' },
        take: 20,
        select: {
          id: true,
          date: true,
          opponent: true,
          homeScore: true,
          awayScore: true,
          competition: true,
          _count: { select: { posts: true } },
        },
      },
    },
  })

  if (!club) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const supabaseAdmin = createAdminClient()
  const { data } = await supabaseAdmin.auth.admin.getUserById(club.userId)

  return NextResponse.json({ ...club, ownerEmail: data.user?.email ?? null })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = body[field]
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: 'Nothing to update' }, { status: 400 })
  }

  const before = await prisma.club.findUnique({ where: { id: params.id }, select: { name: true, suspended: true } })
  const club = await prisma.club.update({ where: { id: params.id }, data })

  await logAdminAction({
    admin,
    action: data.suspended !== undefined ? 'club.suspend_toggle' : 'club.update',
    resourceType: 'club',
    resourceId: params.id,
    beforeValue: before,
    afterValue: data as Prisma.InputJsonValue,
  })

  return NextResponse.json(club)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const before = await prisma.club.findUnique({ where: { id: params.id }, select: { name: true, sport: true, orgId: true } })
  await prisma.club.delete({ where: { id: params.id } })

  await logAdminAction({
    admin,
    action: 'club.delete',
    resourceType: 'club',
    resourceId: params.id,
    beforeValue: before,
  })

  return NextResponse.json({ ok: true })
}
