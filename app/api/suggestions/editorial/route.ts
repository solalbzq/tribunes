import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkEditorialSuggestionsRateLimit, editorialSuggestionsRateLimitedResponse } from '@/lib/quota'
import { suggestEditorialIdeas } from '@/lib/services/editorialSuggestions'

/**
 * Propose jusqu'à 5 idées de publication (catalogue fixe, cf.
 * lib/services/editorialSuggestionsCatalog.ts) adaptées au club. Ne crée
 * jamais de publication : renvoie uniquement des suggestions à pré-remplir
 * dans le formulaire "Publication libre", que l'utilisateur choisit et
 * complète lui-même avant de générer.
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const club = await prisma.club.findUnique({ where: { userId: user.id }, select: { id: true, orgId: true, userId: true, name: true, sport: true } })
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const rateLimit = await checkEditorialSuggestionsRateLimit(club)
  if (!rateLimit.allowed) return editorialSuggestionsRateLimitedResponse()

  try {
    const suggestions = await suggestEditorialIdeas(club.name, club.sport, club.id)
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[suggestions/editorial]', err)
    return NextResponse.json({ error: 'Échec de la génération de suggestions' }, { status: 502 })
  }
}
