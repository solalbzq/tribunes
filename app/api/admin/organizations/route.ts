import { NextRequest, NextResponse } from 'next/server'

import { ensureAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1)
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20') || 20, 1), 100)
  const search = searchParams.get('search')?.trim() ?? ''

  const where = search
    ? { name: { contains: search, mode: 'insensitive' as const } }
    : undefined

  const [organizations, total] = await prisma.$transaction([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        plan: true,
        suspended: true,
        stripeCustomerId: true,
        createdAt: true,
        _count: { select: { members: true, clubs: true } },
      },
    }),
    prisma.organization.count({ where }),
  ])

  return NextResponse.json({
    organizations,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}
