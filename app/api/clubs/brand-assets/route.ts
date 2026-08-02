import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { validateReferenceUpload, validateCharterUpload, MAX_REFERENCES } from '@/lib/services/brandAssetValidation'
import { uploadBrandAsset, signedBrandAssetUrl, deleteBrandAsset } from '@/lib/services/brandAssetStorage'

const KINDS = ['REFERENCE', 'CHARTER'] as const

async function getClub(userId: string) {
  return prisma.club.findUnique({ where: { userId }, select: { id: true } })
}

/** Liste les fichiers importés du club, chacun avec une URL signée fraîche (jamais persistée). */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await getClub(user.id)
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const assets = await prisma.clubBrandAsset.findMany({
    where: { clubId: club.id },
    orderBy: { createdAt: 'desc' },
  })
  const withUrls = await Promise.all(assets.map(async a => ({
    id: a.id, kind: a.kind, sourceNote: a.sourceNote, status: a.status, analysis: a.analysis,
    mimeType: a.mimeType, fileSize: a.fileSize, createdAt: a.createdAt,
    url: await signedBrandAssetUrl(a.storagePath),
  })))

  return NextResponse.json({ assets: withUrls })
}

/** Importe une référence visuelle ou une charte graphique — validation stricte, stockage privé, aucune analyse déclenchée automatiquement. */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await getClub(user.id)
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const form = await req.formData()
  const kind = form.get('kind') as string | null
  const sourceNote = form.get('sourceNote') as string | null
  const file = form.get('file') as File | null

  if (!kind || !(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: 'Type de fichier invalide' }, { status: 400 })
  }

  if (kind === 'REFERENCE') {
    const count = await prisma.clubBrandAsset.count({ where: { clubId: club.id, kind: 'REFERENCE' } })
    if (count >= MAX_REFERENCES) {
      return NextResponse.json({ error: `Maximum ${MAX_REFERENCES} publications de référence — supprimez-en une avant d'en ajouter une nouvelle` }, { status: 400 })
    }
  }

  const validation = kind === 'REFERENCE' ? await validateReferenceUpload(file) : await validateCharterUpload(file)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  const path = `${club.id}/${kind.toLowerCase()}/${randomUUID()}.${validation.ext}`
  try {
    await uploadBrandAsset(path, validation.bytes, validation.contentType)
  } catch {
    return NextResponse.json({ error: "Échec de l'envoi du fichier" }, { status: 500 })
  }

  // Une seule charte active à la fois — l'ancienne n'est remplacée qu'une fois
  // le nouveau fichier validé ET uploadé avec succès, jamais avant : sinon un
  // remplacement qui échoue (fichier invalide, upload interrompu) ferait perdre
  // la charte précédente sans qu'aucune nouvelle ne l'ait remplacée.
  if (kind === 'CHARTER') {
    const existing = await prisma.clubBrandAsset.findFirst({ where: { clubId: club.id, kind: 'CHARTER' } })
    if (existing) {
      await deleteBrandAsset(existing.storagePath).catch(() => {})
      await prisma.clubBrandAsset.delete({ where: { id: existing.id } })
    }
  }

  const asset = await prisma.clubBrandAsset.create({
    data: {
      clubId: club.id,
      kind,
      sourceNote: kind === 'REFERENCE' && (sourceNote === 'own' || sourceNote === 'inspiration') ? sourceNote : null,
      storagePath: path,
      mimeType: validation.contentType,
      fileSize: file!.size,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ asset: { id: asset.id, kind: asset.kind, status: asset.status } })
}
