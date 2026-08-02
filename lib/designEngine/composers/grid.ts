import type { ComposerContext, FrameNode, GridVariantId, BackgroundVariantId } from '../types'
import { pick } from '../rng'

export type GridResult = {
  variantId: GridVariantId
  root: FrameNode
  /** Références directes vers les zones à remplir — évite de retraverser l'arbre pour les localiser. */
  zones: { logo: FrameNode; hero: FrameNode; meta: FrameNode }
}

function zone(role: string, overrides: Partial<FrameNode> = {}): FrameNode {
  return {
    kind: 'frame',
    role,
    direction: 'column',
    align: 'start',
    justify: 'start',
    gap: 0,
    padding: 0,
    grow: 0,
    children: [],
    ...overrides,
  }
}

/**
 * Couche Grille — décide de l'arrangement général (où respire l'espace, où s'ancre le
 * score). Le choix de variante de Fond contraint le choix de grille compatible : un
 * bloc d'accent (accent-block) n'a de sens qu'avec la grille accent-split qui sait
 * l'exploiter. C'est la "compatibilité entre couches" du plan, simplifiée pour ce
 * prototype en un mapping direct plutôt qu'un solveur de contraintes générique.
 */
export function composeGrid(
  ctx: ComposerContext,
  backgroundVariantId: BackgroundVariantId,
  pageColor: string,
  accentColor: string,
): GridResult {
  const { family, rng } = ctx
  const margin = family.margin

  if (backgroundVariantId === 'accent-block') {
    const logoZone = zone('logo-zone', { direction: 'row', align: 'center', padding: 0 })
    const heroZone = zone('hero-zone', {
      direction: 'column',
      justify: 'end',
      padding: margin,
      gap: 24,
      background: { color: accentColor },
    })
    const metaZone = zone('meta-zone', {
      direction: 'column',
      justify: 'center',
      padding: margin,
      gap: 16,
      grow: 1,
      background: { color: pageColor },
    })
    heroZone.children.push(logoZone)
    const root: FrameNode = {
      kind: 'frame',
      role: 'root',
      direction: 'column',
      align: 'stretch',
      justify: 'start',
      gap: 0,
      padding: 0,
      grow: 1,
      children: [heroZone, metaZone],
    }
    return { variantId: 'accent-split', root, zones: { logo: logoZone, hero: heroZone, meta: metaZone } }
  }

  if (family.id === 'editorial') {
    // solid : pas de bloc d'accent, colonne éditoriale alignée à gauche avec beaucoup d'air en tête.
    const logoZone = zone('logo-zone', { direction: 'row', align: 'center' })
    const heroZone = zone('hero-zone', { direction: 'column', gap: 20 })
    const metaZone = zone('meta-zone', { direction: 'column', gap: 14 })
    const root: FrameNode = {
      kind: 'frame',
      role: 'root',
      direction: 'column',
      align: 'start',
      justify: 'start',
      gap: 56,
      padding: margin,
      grow: 1,
      children: [logoZone, heroZone, metaZone],
    }
    return { variantId: 'top-weighted', root, zones: { logo: logoZone, hero: heroZone, meta: metaZone } }
  }

  if (family.id === 'premium') {
    // Un cadre fin en retrait des bords — codes du luxe (invitation, catalogue) — entoure
    // une composition centrée classique.
    const logoZone = zone('logo-zone', { direction: 'row', align: 'center' })
    const heroZone = zone('hero-zone', { direction: 'column', align: 'center', gap: 28 })
    const metaZone = zone('meta-zone', { direction: 'column', align: 'center', gap: 16 })
    const frame = zone('premium-frame', {
      direction: 'column',
      align: 'center',
      justify: 'center',
      gap: 44,
      padding: margin,
      grow: 1,
      border: { color: ctx.brandKit.secondaryColor, width: 1 },
      children: [logoZone, heroZone, metaZone],
    })
    const root: FrameNode = {
      kind: 'frame',
      role: 'root',
      direction: 'column',
      align: 'stretch',
      justify: 'start',
      gap: 0,
      padding: 48,
      grow: 1,
      children: [frame],
    }
    return { variantId: 'framed-center', root, zones: { logo: logoZone, hero: heroZone, meta: metaZone } }
  }

  // Familles restantes (minimal, bold, dynamic) : centered ou bottom-weighted selon les
  // variantes déclarées par la famille — aucune contrainte de compatibilité supplémentaire.
  const variantId = pick(rng, family.gridVariants)
  const logoZone = zone('logo-zone', { direction: 'row', align: 'center' })
  const heroZone = zone('hero-zone', { direction: 'column', align: 'center', gap: 24 })
  const metaZone = zone('meta-zone', { direction: 'column', align: 'center', gap: 14 })

  const root: FrameNode = {
    kind: 'frame',
    role: 'root',
    direction: 'column',
    align: 'center',
    justify: variantId === 'bottom-weighted' ? 'end' : 'center',
    gap: 40,
    padding: margin,
    grow: 1,
    children: [logoZone, heroZone, metaZone],
  }
  return { variantId, root, zones: { logo: logoZone, hero: heroZone, meta: metaZone } }
}
