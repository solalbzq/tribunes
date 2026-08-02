import type { BrandKit, Composition, DesignFamilyId, MatchResultContent } from './types'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './types'
import { createRng, hashSeed } from './rng'
import { FAMILIES } from './families'
import { buildMatchResultBlueprint } from './blueprints/matchResult'
import { composeBackground } from './composers/background'
import { composeGrid } from './composers/grid'
import { composeTypography } from './composers/typography'
import { composeInformation } from './composers/information'
import { composeLogo } from './composers/logo'
import { composeSignature } from './composers/signature'

export type ComposeMatchResultParams = {
  content: MatchResultContent
  brandKit: BrandKit
  family: DesignFamilyId
  /** Graine explicite (ex. `${matchId}:${variantIndex}`) — déterministe : la même graine reproduit toujours le même visuel. */
  seed: string
  logoDataUri: string | null
}

/**
 * Orchestrateur — fait dialoguer les couches indépendantes et produit un arbre de
 * Composition cohérent. C'est la seule fonction qui connaît l'existence de toutes les
 * couches ; chaque composer ignore les autres. Cf. plan §5.5.
 */
export function composeMatchResult(params: ComposeMatchResultParams): Composition {
  const { content, brandKit, family: familyId, seed, logoDataUri } = params
  const family = FAMILIES[familyId]
  const rng = createRng(hashSeed(seed))
  const blueprint = buildMatchResultBlueprint(content)

  const ctx = { content, blueprint, brandKit, family, rng }

  const background = composeBackground(ctx)
  const grid = composeGrid(ctx, background.variantId, background.pageColor, background.accentColor)
  const typo = composeTypography(ctx)
  const info = composeInformation(ctx, typo, background.textOnAccent, background.textOnPage)
  const logoTextColor = grid.variantId === 'accent-split' ? background.textOnAccent : background.textOnPage
  const logoNodes = composeLogo(ctx, logoDataUri, logoTextColor)
  const signature = composeSignature(ctx, background.textOnPage)

  grid.zones.logo.children.push(...logoNodes)
  grid.zones.hero.children.push(info.hero)
  if (signature.placement === 'inline-hero') {
    grid.zones.hero.children.push(signature.node)
  }

  if (grid.variantId === 'accent-split') {
    // Le bloc d'accent porte assez de poids visuel pour aussi accueillir le nom/résultat.
    grid.zones.hero.children.push(...info.primary)
    grid.zones.meta.children.push(...info.secondary, ...info.tertiary)
  } else {
    grid.zones.meta.children.push(...info.primary, ...info.secondary, ...info.tertiary)
  }

  // Couleur de page toujours posée sur la racine — les zones d'accent la recouvrent
  // partiellement mais la racine doit rester correcte même sous les décorations.
  grid.root.background = { color: background.pageColor }

  // Décorations de fond derrière tout le reste, signature hors-flux au-dessus de tout.
  grid.root.children.unshift(...background.decorations)
  if (signature.placement === 'absolute') {
    grid.root.children.push(signature.node)
  }

  return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, root: grid.root }
}
