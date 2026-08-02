import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { CLUB_VOICES } from '@/lib/voice'
import { POST_TYPES } from '@/lib/postTypes'
import { validateTypeInstructions, PERSONALIZATION_LIMITS } from '@/lib/personalization'
import { logPersonalizationSignal } from '@/lib/services/personalizationSignals'

function isKnownPostType(value: string): value is keyof typeof POST_TYPES {
  return value in POST_TYPES
}

async function getClub(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.club.findUnique({ where: { userId: user.id }, select: { id: true } })
}

/** Crée ou remplace l'override de personnalisation d'un type de publication pour le club authentifié. */
export async function PUT(req: Request, { params }: { params: { postType: string } }) {
  const club = await getClub(req)
  if (!club) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isKnownPostType(params.postType)) return NextResponse.json({ error: 'Type de publication inconnu' }, { status: 400 })

  const { voiceOverride, customInstructions, signaturePhrase } = await req.json()

  if (voiceOverride !== undefined && voiceOverride !== null && !(CLUB_VOICES as string[]).includes(voiceOverride)) {
    return NextResponse.json({ error: 'Voix invalide' }, { status: 400 })
  }

  const instructions = validateTypeInstructions(customInstructions)
  if (!instructions.ok) return NextResponse.json({ error: instructions.error }, { status: 400 })

  const signature = typeof signaturePhrase === 'string' ? signaturePhrase.trim() : null
  if (signature && signature.length > PERSONALIZATION_LIMITS.signaturePhrase) {
    return NextResponse.json({ error: `La signature est limitée à ${PERSONALIZATION_LIMITS.signaturePhrase} caractères` }, { status: 400 })
  }

  const data = {
    voiceOverride: voiceOverride || null,
    customInstructions: instructions.value,
    signaturePhrase: signature || null,
  }

  const override = await prisma.clubPersonalizationOverride.upsert({
    where: { clubId_postType: { clubId: club.id, postType: params.postType } },
    update: data,
    create: { clubId: club.id, postType: params.postType, ...data },
  })

  await logPersonalizationSignal(club.id, 'type_override_saved', { postType: params.postType })

  return NextResponse.json({ override })
}

/** Supprime l'override d'un type — le post retombe entièrement sur l'identité générale du club. */
export async function DELETE(req: Request, { params }: { params: { postType: string } }) {
  const club = await getClub(req)
  if (!club) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isKnownPostType(params.postType)) return NextResponse.json({ error: 'Type de publication inconnu' }, { status: 400 })

  await prisma.clubPersonalizationOverride.deleteMany({ where: { clubId: club.id, postType: params.postType } })

  await logPersonalizationSignal(club.id, 'type_override_reverted', { postType: params.postType })

  return NextResponse.json({ ok: true })
}
