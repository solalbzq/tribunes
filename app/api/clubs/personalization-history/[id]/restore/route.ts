import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { CLUB_VOICES } from '@/lib/voice'
import { isValidHexColor } from '@/lib/personalization'
import { getPersonalizationHistoryEntry, recordPersonalizationHistory, type PersonalizationSnapshot } from '@/lib/services/personalizationHistory'

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Valide un snapshot d'historique avant de l'appliquer — jamais une confiance aveugle dans un blob JSON stocké. */
function parseSnapshot(raw: unknown): PersonalizationSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const contentTone = typeof s.contentTone === 'string' && (CLUB_VOICES as string[]).includes(s.contentTone) ? s.contentTone : 'STANDARD'
  const primaryColor = isValidHexColor(s.primaryColor) ? s.primaryColor : '#1a1a2e'
  const secondaryColor = isValidHexColor(s.secondaryColor) ? s.secondaryColor : '#e94560'
  return {
    contentTone,
    customInstructions: str(s.customInstructions),
    signaturePhrase: str(s.signaturePhrase),
    bannedWords: str(s.bannedWords),
    primaryColor,
    secondaryColor,
    logoUrl: str(s.logoUrl),
  }
}

/** Restaure une version précédente de l'identité générale du club — l'ancienne configuration reste elle-même dans l'historique (append-only, jamais écrasée). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const entry = await getPersonalizationHistoryEntry(club.id, params.id)
  if (!entry) return NextResponse.json({ error: 'Version introuvable' }, { status: 404 })

  const snapshot = parseSnapshot(entry.snapshot)
  if (!snapshot) return NextResponse.json({ error: 'Version corrompue, restauration impossible' }, { status: 422 })

  const updated = await prisma.club.update({
    where: { id: club.id },
    data: {
      contentTone: snapshot.contentTone,
      customInstructions: snapshot.customInstructions,
      signaturePhrase: snapshot.signaturePhrase,
      bannedWords: snapshot.bannedWords,
      primaryColor: snapshot.primaryColor,
      secondaryColor: snapshot.secondaryColor,
      ...(snapshot.logoUrl !== null ? { logoUrl: snapshot.logoUrl } : {}),
    },
  })

  await recordPersonalizationHistory(club.id, user.id, snapshot)

  return NextResponse.json({ club: updated })
}
