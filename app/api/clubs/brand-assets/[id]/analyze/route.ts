// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js')
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkBrandAssetAnalysisRateLimit, brandAssetAnalysisRateLimitedResponse } from '@/lib/quota'
import { signedBrandAssetUrl, downloadBrandAsset } from '@/lib/services/brandAssetStorage'
import { analyzeReferenceImage, analyzeCharterImage, analyzeCharterPdfText } from '@/lib/services/brandAssetAnalysis'

const PDF_PARSE_TIMEOUT_MS = 15_000

/** `{ max: 1 }` borne la boucle d'extraction de texte de pdf-parse, mais pas le chargement structurel initial du document — un timeout explicite protège contre un PDF pathologique (arborescence très profonde, flux fortement compressés). */
function parsePdfWithTimeout(buffer: Buffer): Promise<{ text?: string }> {
  return Promise.race([
    pdfParse(buffer, { max: 1 }) as Promise<{ text?: string }>,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Analyse PDF trop longue')), PDF_PARSE_TIMEOUT_MS)),
  ])
}

/**
 * Déclenche l'analyse IA d'un fichier déjà importé. Ne modifie jamais la
 * configuration active du club — l'analyse est une proposition, affichée et
 * validée par l'utilisateur avant toute application (cf. route .../apply).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true, orgId: true, userId: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const asset = await prisma.clubBrandAsset.findFirst({ where: { id: params.id, clubId: club.id } })
  if (!asset) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })

  const rateLimit = await checkBrandAssetAnalysisRateLimit(club)
  if (!rateLimit.allowed) return brandAssetAnalysisRateLimitedResponse()

  try {
    let analysis
    if (asset.mimeType === 'application/pdf') {
      const bytes = await downloadBrandAsset(asset.storagePath)
      const parsed = await parsePdfWithTimeout(Buffer.from(bytes))
      analysis = await analyzeCharterPdfText(parsed.text ?? '', club.id)
    } else {
      const url = await signedBrandAssetUrl(asset.storagePath)
      if (!url) throw new Error('URL signée indisponible')
      analysis = asset.kind === 'REFERENCE'
        ? await analyzeReferenceImage(url, club.id)
        : await analyzeCharterImage(url, club.id)
    }

    const updated = await prisma.clubBrandAsset.update({
      where: { id: asset.id },
      data: { status: 'ANALYZED', analysis: analysis as object },
    })
    return NextResponse.json({ status: updated.status, analysis: updated.analysis })
  } catch (err) {
    console.error('[brand-assets/analyze]', err)
    // Best-effort : si l'asset a été supprimé entre-temps (course avec DELETE),
    // cette mise à jour échoue à son tour — ne doit jamais masquer la réponse 502 déjà décidée.
    await prisma.clubBrandAsset.update({ where: { id: asset.id }, data: { status: 'FAILED' } }).catch(() => {})
    return NextResponse.json({ error: "Échec de l'analyse, réessaie plus tard" }, { status: 502 })
  }
}
