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
  const resourceType = searchParams.get('resourceType')?.trim() || undefined

  const where = resourceType ? { resourceType } : undefined

  const [entries, total] = await prisma.$transaction([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ])

  return NextResponse.json({
    entries,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}
