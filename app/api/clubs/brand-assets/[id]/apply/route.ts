import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isValidHexColor, validateClubPersonalizationInput } from '@/lib/personalization'
import { recordPersonalizationHistory } from '@/lib/services/personalizationHistory'

/**
 * Applique une sélection de caractéristiques détectées (couleurs, phrase de
 * consigne) à l'identité active du club — jamais automatique : le corps de
 * la requête ne contient que ce que l'utilisateur a explicitement coché et
 * éventuellement corrigé dans l'écran de validation. Chaque champ reste
 * optionnel, seuls les champs envoyés sont modifiés.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({
    where: { userId: user.id },
    select: { id: true, contentTone: true, customInstructions: true, signaturePhrase: true, bannedWords: true, primaryColor: true, secondaryColor: true, logoUrl: true },
  })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const asset = await prisma.clubBrandAsset.findFirst({ where: { id: params.id, clubId: club.id } })
  if (!asset) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })

  const { primaryColor, secondaryColor, instructionsSentence } = await req.json()

  if (primaryColor !== undefined && !isValidHexColor(primaryColor)) {
    return NextResponse.json({ error: 'Couleur principale invalide' }, { status: 400 })
  }
  if (secondaryColor !== undefined && !isValidHexColor(secondaryColor)) {
    return NextResponse.json({ error: "Couleur d'accentuation invalide" }, { status: 400 })
  }

  const mergedInstructions = instructionsSentence
    ? [club.customInstructions, instructionsSentence].filter(Boolean).join(' ')
    : undefined

  const personalization = validateClubPersonalizationInput({
    customInstructions: mergedInstructions !== undefined ? mergedInstructions : club.customInstructions,
    signaturePhrase: club.signaturePhrase,
    bannedWords: club.bannedWords,
  })
  if (!personalization.ok) return NextResponse.json({ error: personalization.error }, { status: 400 })

  const updated = await prisma.club.update({
    where: { id: club.id },
    data: {
      ...(primaryColor !== undefined ? { primaryColor } : {}),
      ...(secondaryColor !== undefined ? { secondaryColor } : {}),
      ...(mergedInstructions !== undefined ? { customInstructions: personalization.value.customInstructions } : {}),
    },
  })

  await recordPersonalizationHistory(club.id, user.id, {
    contentTone: updated.contentTone,
    customInstructions: updated.customInstructions,
    signaturePhrase: updated.signaturePhrase,
    bannedWords: updated.bannedWords,
    primaryColor: updated.primaryColor,
    secondaryColor: updated.secondaryColor,
    logoUrl: updated.logoUrl,
  })

  return NextResponse.json({ club: updated })
}
