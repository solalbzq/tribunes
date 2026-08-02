import type { ComposerContext } from '../types'

export type TypographyResult = {
  hero: number
  primary: number
  secondary: number
  tertiary: number
}

/**
 * Couche Hiérarchie typographique — résout les rangs d'importance du blueprint en
 * tailles réelles. Une légère variance contrôlée (±6%) évite que deux visuels utilisant
 * exactement les mêmes rôles paraissent pixel-identiques, sans jamais casser la
 * hiérarchie (le hero reste toujours largement dominant). Cf. plan §5.5.
 */
export function composeTypography(ctx: ComposerContext): TypographyResult {
  const { family, rng } = ctx
  const jitter = () => 0.94 + rng() * 0.12

  return {
    hero: Math.round(232 * family.heroScale * jitter()),
    primary: Math.round(46 * jitter()),
    secondary: Math.round(27 * jitter()),
    tertiary: Math.round(22 * jitter()),
  }
}
