import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, isAdminPayload, verifyAdminToken } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

function escapeCsvValue(value: string) {
  const normalized = value.replace(/"/g, '""')
  return `"${normalized}"`
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value)
}

async function ensureAdmin(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value

  if (!token) {
    return false
  }

  try {
    const payload = await verifyAdminToken(token)
    return isAdminPayload(payload)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1)
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20') || 20, 1), 100)
  const search = searchParams.get('search')?.trim() ?? ''
  const format = searchParams.get('format')

  const where = search
    ? {
        email: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }
    : undefined

  if (format === 'csv') {
    const entries = await prisma.waitlistEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const rows = entries.map((entry) =>
      [
        escapeCsvValue(entry.email),
        escapeCsvValue(entry.clubName ?? ''),
        escapeCsvValue(entry.sport ?? ''),
        escapeCsvValue(formatDate(entry.createdAt)),
        escapeCsvValue(entry.converted ? 'Payant' : 'En attente'),
      ].join(','),
    )

    return new NextResponse(
      ['Email,Club,Sport,Date,Statut', ...rows].join('\n'),
      {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=inscrits-tribunes.csv',
        },
      },
    )
  }

  const [entries, total] = await prisma.$transaction([
    prisma.waitlistEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.waitlistEntry.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return NextResponse.json({
    entries,
    total,
    page,
    totalPages,
  })
}
