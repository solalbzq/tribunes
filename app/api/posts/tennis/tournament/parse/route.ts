import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { parseFftPdf } from '@/lib/services/fft-pdf-parser'

const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const club = await prisma.club.findUnique({ where: { userId: user.id } })
    if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

    const formData = await req.formData()
    const pdfFile = formData.get('pdfFile') as File | null
    const clubNameFilter = (formData.get('clubName') as string) || club.name

    if (!pdfFile) return NextResponse.json({ error: 'Fichier PDF manquant' }, { status: 400 })
    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Le fichier doit être un PDF (application/pdf)' }, { status: 400 })
    }
    if (pdfFile.size > MAX_PDF_SIZE) {
      return NextResponse.json({ error: 'Le PDF ne doit pas dépasser 10 Mo' }, { status: 400 })
    }

    const buffer = Buffer.from(await pdfFile.arrayBuffer())

    // Parse the PDF
    let parsed
    try {
      parsed = await parseFftPdf(buffer, clubNameFilter)
    } catch (parseErr) {
      console.error('[parse/route] parseFftPdf error:', parseErr)
      return NextResponse.json(
        { error: `Impossible de lire ce PDF : ${(parseErr as Error).message}` },
        { status: 400 }
      )
    }

    // Upload PDF to Supabase Storage (non-blocking)
    let pdfUrl: string | null = null
    try {
      const path = `tournament-pdfs/${club.id}/${Date.now()}.pdf`
      const { error: uploadErr } = await supabase.storage
        .from('tournament-pdfs')
        .upload(path, buffer, { contentType: 'application/pdf' })
      if (uploadErr) {
        console.warn('[parse/route] Storage upload skipped:', uploadErr.message)
      } else {
        const { data } = supabase.storage.from('tournament-pdfs').getPublicUrl(path)
        pdfUrl = data.publicUrl
      }
    } catch (storageErr) {
      console.warn('[parse/route] Storage error (non-blocking):', storageErr)
    }

    // Save to DB
    const schedule = await prisma.tournamentSchedule.create({
      data: {
        clubId: club.id,
        sport: parsed.sport,
        pdfUrl,
        rawText: parsed.rawText.slice(0, 50000),
        matchDate: parsed.matchDate,
        tournamentName: parsed.tournamentName,
        venue: parsed.venue,
        parsedData: parsed as unknown as never,
      },
    })

    return NextResponse.json({
      scheduleId: schedule.id,
      tournamentName: parsed.tournamentName,
      venue: parsed.venue,
      matchDate: parsed.matchDate,
      sport: parsed.sport,
      totalMatches: parsed.matches.length,
      clubMatches: parsed.clubMatches,
    })
  } catch (err) {
    console.error('[parse/route] Unhandled error:', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
