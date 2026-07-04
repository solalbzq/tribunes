import { NextRequest, NextResponse } from 'next/server'

import { ensureAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1)
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20') || 20, 1), 100)
  const search = searchParams.get('search')?.trim().toLowerCase() ?? ''

  const supabaseAdmin = createAdminClient()

  // Supabase Admin API doesn't support server-side email search, so we page through
  // results and filter in memory. Fine at current scale; revisit if user count grows large.
  const perPage = 1000
  let allUsers: Array<{ id: string; email: string | undefined; createdAt: string; bannedUntil?: string }> = []
  let supaPage = 1
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: supaPage, perPage })
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }
    allUsers = allUsers.concat(
      data.users.map((u) => ({
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        bannedUntil: (u as { banned_until?: string }).banned_until,
      })),
    )
    if (data.users.length < perPage) break
    supaPage += 1
  }

  const filtered = search
    ? allUsers.filter((u) => u.email?.toLowerCase().includes(search))
    : allUsers

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = filtered.length
  const pageUsers = filtered.slice((page - 1) * limit, page * limit)

  const userIds = pageUsers.map((u) => u.id)
  const [clubs, memberships] = await Promise.all([
    prisma.club.findMany({ where: { userId: { in: userIds } }, select: { userId: true, name: true, sport: true } }),
    prisma.organizationMember.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, role: true, org: { select: { id: true, name: true, plan: true } } },
    }),
  ])

  const clubByUser = new Map(clubs.map((c) => [c.userId, c]))
  const membershipByUser = new Map(memberships.map((m) => [m.userId, m]))

  const users = pageUsers.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    createdAt: u.createdAt,
    suspended: Boolean(u.bannedUntil && new Date(u.bannedUntil) > new Date()),
    club: clubByUser.get(u.id) ?? null,
    membership: membershipByUser.get(u.id) ?? null,
  }))

  return NextResponse.json({
    users,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}
