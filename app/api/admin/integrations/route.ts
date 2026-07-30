import { NextRequest, NextResponse } from 'next/server'

import { ensureAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

const EXPIRY_WARNING_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const provider = request.nextUrl.searchParams.get('provider')?.trim() || undefined
  const where = provider ? { provider } : undefined
  const now = new Date()
  const soon = new Date(now.getTime() + EXPIRY_WARNING_MS)

  // select explicite : accessToken n'est jamais lu ni renvoyé par cette route.
  const connections = await prisma.socialConnection.findMany({
    where,
    orderBy: { tokenExpiresAt: 'asc' },
    select: {
      id: true,
      provider: true,
      accountName: true,
      avatarUrl: true,
      tokenExpiresAt: true,
      createdAt: true,
      club: { select: { id: true, name: true } },
    },
  })

  const rows = connections.map((c) => ({
    ...c,
    expiryStatus: !c.tokenExpiresAt
      ? 'unknown'
      : c.tokenExpiresAt < now
        ? 'expired'
        : c.tokenExpiresAt < soon
          ? 'expiring'
          : 'ok',
  }))

  return NextResponse.json({
    connections: rows,
    total: rows.length,
    expiredCount: rows.filter((r) => r.expiryStatus === 'expired').length,
    expiringCount: rows.filter((r) => r.expiryStatus === 'expiring').length,
  })
}
