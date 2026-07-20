import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

const RETENTION_DAYS = 30

function storagePathFromUrl(url: string): string | null {
  const marker = '/club-assets/'
  const idx = url.indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

/**
 * Purge quotidienne : brouillons/rejets/échecs de plus de 30 jours (jamais
 * traités), et posts publiés de plus de 30 jours (surplus d'historique).
 * Supprime aussi le visuel stocké dans Supabase Storage (bucket club-assets)
 * avant de supprimer la ligne, pour ne pas laisser de fichiers orphelins.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  const stale = await prisma.generatedPost.findMany({
    where: {
      OR: [
        { status: { in: ['DRAFT', 'REJECTED', 'FAILED', 'PARTIAL'] }, createdAt: { lt: cutoff } },
        { status: 'PUBLISHED', publishedAt: { lt: cutoff } },
      ],
    },
    select: { id: true, imageUrl: true },
  })

  if (stale.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, imagesRemoved: 0 })
  }

  const imagePaths = stale
    .map(p => (p.imageUrl ? storagePathFromUrl(p.imageUrl) : null))
    .filter((p): p is string => Boolean(p))

  if (imagePaths.length > 0) {
    const supabase = createAdminClient()
    const { error } = await supabase.storage.from('club-assets').remove(imagePaths)
    if (error) console.warn('[cron/cleanup-posts] suppression storage échouée (non bloquant):', error.message)
  }

  await prisma.generatedPost.deleteMany({ where: { id: { in: stale.map(p => p.id) } } })

  return NextResponse.json({ ok: true, deleted: stale.length, imagesRemoved: imagePaths.length })
}
