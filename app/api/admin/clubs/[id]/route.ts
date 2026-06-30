import { NextRequest, NextResponse } from 'next/server'

import { ensureAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

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
  if (!(await ensureAdmin(request))) {
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

  const club = await prisma.club.update({ where: { id: params.id }, data })
  return NextResponse.json(club)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  await prisma.club.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
