import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { CLUB_VOICES } from '@/lib/voice'
import { resolvePlanForClub } from '@/lib/org'
import { sanitizeFooterElements } from '@/lib/visualLayout'
import { validateClubPersonalizationInput } from '@/lib/personalization'

// Sanitisation "bandeau premium" : neutralise toute personnalisation du footer
// (masquage, remplacement par le nom du club) envoyée par un club au plan
// FREE, quel que soit ce que l'UI propose côté client — cf. lib/plans.ts
// (quotas.watermark) pour la même logique de plan appliquée au filigrane.
function sanitizeVisualConfigByFormat(raw: unknown, isPremium: boolean): unknown {
  if (isPremium || !raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const obj = raw as Record<string, unknown>
  const sanitizeSub = (sub: unknown): unknown => {
    if (!sub || typeof sub !== 'object' || !Array.isArray((sub as Record<string, unknown>).elements)) return sub
    const s = sub as Record<string, unknown>
    return { ...s, elements: sanitizeFooterElements(s.elements as Parameters<typeof sanitizeFooterElements>[0], false) }
  }
  return { ...obj, post: sanitizeSub(obj.post), story: sanitizeSub(obj.story) }
}

function sanitizePostVisualConfigsPayload(raw: unknown, isPremium: boolean): unknown {
  if (isPremium || !raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const obj = raw as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [kind, entry] of Object.entries(obj)) {
    result[kind] = sanitizeVisualConfigByFormat(entry, isPremium)
  }
  return result
}

export async function POST(req: Request) {
  const supabase = createClient()
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    name, sport, primaryColor, secondaryColor, visualConfig, tennisVisualConfig, postVisualConfigs,
    tenupUrl, contentTone, customInstructions, signaturePhrase, bannedWords,
  } = await req.json()
  if (!name || !sport) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const personalization = validateClubPersonalizationInput({ customInstructions, signaturePhrase, bannedWords })
  if (!personalization.ok) return NextResponse.json({ error: personalization.error }, { status: 400 })

  const existing = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true, orgId: true } })
  const { plan } = await resolvePlanForClub({ orgId: existing?.orgId ?? null, userId: user.id })
  const isPremium = plan !== 'FREE'

  const data = {
    name, sport,
    ...(primaryColor !== undefined ? { primaryColor } : {}),
    ...(secondaryColor !== undefined ? { secondaryColor } : {}),
    ...(visualConfig !== undefined ? { visualConfig: sanitizeVisualConfigByFormat(visualConfig, isPremium) as object } : {}),
    ...(tennisVisualConfig !== undefined ? { tennisVisualConfig } : {}),
    ...(postVisualConfigs !== undefined ? { postVisualConfigs: sanitizePostVisualConfigsPayload(postVisualConfigs, isPremium) as object } : {}),
    ...(tenupUrl !== undefined ? { tenupUrl: tenupUrl || null } : {}),
    ...(contentTone !== undefined && CLUB_VOICES.includes(contentTone) ? { contentTone } : {}),
    ...(customInstructions !== undefined ? { customInstructions: personalization.value.customInstructions } : {}),
    ...(signaturePhrase !== undefined ? { signaturePhrase: personalization.value.signaturePhrase } : {}),
    ...(bannedWords !== undefined ? { bannedWords: personalization.value.bannedWords } : {}),
  }

  const club = await prisma.club.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  })

  return NextResponse.json(club)
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id } })
  return NextResponse.json(club)
}
