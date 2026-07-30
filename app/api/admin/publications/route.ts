import { NextRequest, NextResponse } from 'next/server'

import { ensureAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { formatPostType, relationClubInclude, findRelationValue } from '@/lib/postTypes'

/**
 * Vue admin du cycle de vie des publications. Fenêtre limitée par nature :
 * le cron cleanup-posts purge définitivement les GeneratedPost de plus de
 * 30 jours (DRAFT/REJECTED/FAILED/PARTIAL dès createdAt, PUBLISHED dès
 * publishedAt) — aucune agrégation pré-purge n'existe, donc cette vue ne
 * peut refléter que ce qui a survécu à la purge.
 */
export async function GET(request: NextRequest) {
  if (!(await ensureAdmin(request))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1)
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20') || 20, 1), 100)
  const status = searchParams.get('status')?.trim() || undefined
  const platform = searchParams.get('platform')?.trim() || undefined

  const where = {
    ...(status ? { status } : {}),
    ...(platform ? { platform } : {}),
  }

  const [posts, total, byStatus, byPlatform] = await prisma.$transaction([
    prisma.generatedPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        platform: true,
        postType: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        rejectedReason: true,
        ...relationClubInclude({ id: true, name: true }),
      },
    }),
    prisma.generatedPost.count({ where }),
    prisma.generatedPost.groupBy({ by: ['status'], _count: true, orderBy: { status: 'asc' } }),
    prisma.generatedPost.groupBy({ by: ['platform'], _count: true, orderBy: { platform: 'asc' } }),
  ])

  const rows = posts.map((post) => {
    const club = findRelationValue<{ id: string; name: string }>(
      post as unknown as Record<string, { club?: { id: string; name: string } } | null>,
      'club',
    )
    return {
      id: post.id,
      platform: post.platform,
      postType: post.postType,
      postTypeLabel: formatPostType(post.postType),
      status: post.status,
      createdAt: post.createdAt,
      publishedAt: post.publishedAt,
      rejectedReason: post.rejectedReason,
      clubId: club?.id ?? null,
      clubName: club?.name ?? null,
    }
  })

  return NextResponse.json({
    posts: rows,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    byPlatform: Object.fromEntries(byPlatform.map((p) => [p.platform, p._count])),
  })
}
