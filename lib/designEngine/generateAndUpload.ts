import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveBrandKit } from './brandKit'
import { composeMatchResult } from './orchestrator'
import { renderCompositionToPng } from './render/satoriRenderer'
import type { DesignFamilyId, MatchResultContent } from './types'

type ClubForVisual = {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
}

async function fetchLogoDataUri(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null
  try {
    const res = await fetch(logoUrl)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'image/png'
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Rend un visuel "Résultat de match" côté serveur (Design Engine) et l'upload vers le
 * bucket public existant, comme le fait déjà app/api/social/publish/route.ts pour les
 * visuels canvas. Chemin toujours unique (jamais réutilisé) pour ne jamais dépendre
 * d'une policy RLS d'UPDATE sur storage.objects — cohérent avec les conventions
 * existantes (published/, backgrounds/).
 */
export async function generateMatchResultVisual(params: {
  supabase: SupabaseClient
  club: ClubForVisual
  matchId: string
  content: MatchResultContent
  family: DesignFamilyId
  seed?: string
}): Promise<string> {
  const { supabase, club, matchId, content, family, seed } = params

  const logoDataUri = await fetchLogoDataUri(club.logoUrl)
  const composition = composeMatchResult({
    content,
    brandKit: resolveBrandKit(club),
    family,
    seed: seed ?? `${matchId}:${Date.now()}`,
    logoDataUri,
  })

  const png = await renderCompositionToPng(composition)
  const path = `design-engine/${club.id}/${matchId}-${Date.now()}.png`

  const { error } = await supabase.storage.from('club-assets').upload(path, png, {
    contentType: 'image/png',
    upsert: false,
  })
  if (error) throw new Error(`Upload du visuel Design Engine échoué : ${error.message}`)

  return supabase.storage.from('club-assets').getPublicUrl(path).data.publicUrl
}
