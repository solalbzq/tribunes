import type { CompositionNode, ComposerContext, BackgroundVariantId } from '../types'
import { pick } from '../rng'
import { darken, mix, readableTextColor } from '../color'

export type BackgroundResult = {
  variantId: BackgroundVariantId
  /** Couleur de la page (zone hors accent). */
  pageColor: string
  /** Couleur de l'éventuel bloc d'accent (variant accent-block) — sinon égale à pageColor. */
  accentColor: string
  textOnPage: string
  textOnAccent: string
  /** Décorations placées derrière le contenu (halo...) — vide pour les variantes sans décoration. */
  decorations: CompositionNode[]
}

/**
 * Couche Fond — propose plusieurs variantes compatibles avec la famille, choisit une
 * palette de page cohérente avec la couleur de marque. Ne connaît rien du contenu ni
 * de la grille : uniquement la marque et la famille. Cf. plan §5.5.
 */
export function composeBackground(ctx: ComposerContext): BackgroundResult {
  const { brandKit, family, rng } = ctx
  const variantId = pick(rng, family.backgroundVariants)

  if (variantId === 'accent-block') {
    const pageColor = '#f7f6f3'
    const accentColor = darken(brandKit.primaryColor, 0.08)
    return {
      variantId,
      pageColor,
      accentColor,
      textOnPage: readableTextColor(pageColor),
      textOnAccent: readableTextColor(accentColor),
      decorations: [],
    }
  }

  // solid / gradient-halo : fond sombre teinté par la couleur de marque, typographie claire —
  // registre "premium sobre" plutôt que "carte colorée".
  const pageColor = mix('#0a0a0c', brandKit.primaryColor, 0.16)
  const textOnPage = readableTextColor(pageColor)

  const decorations: CompositionNode[] = []
  if (variantId === 'gradient-halo') {
    const corner = pick(rng, ['top-right', 'bottom-left'] as const)
    const size = 900
    decorations.push({
      kind: 'shape',
      role: 'background-halo',
      shape: 'dot',
      color: brandKit.secondaryColor,
      width: size,
      height: size,
      opacity: 0.16,
      absolute:
        corner === 'top-right'
          ? { top: -size * 0.4, right: -size * 0.35 }
          : { bottom: -size * 0.4, left: -size * 0.35 },
    })
  }

  return {
    variantId,
    pageColor,
    accentColor: pageColor,
    textOnPage,
    textOnAccent: textOnPage,
    decorations,
  }
}
