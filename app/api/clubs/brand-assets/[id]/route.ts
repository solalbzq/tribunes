import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { deleteBrandAsset } from '@/lib/services/brandAssetStorage'

/** Supprime un fichier importé (et son analyse) — fichier et ligne, scopé au club authentifié. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const asset = await prisma.clubBrandAsset.findFirst({ where: { id: params.id, clubId: club.id } })
  if (!asset) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })

  await deleteBrandAsset(asset.storagePath).catch(() => {})
  await prisma.clubBrandAsset.delete({ where: { id: asset.id } })

  return NextResponse.json({ ok: true })
}
