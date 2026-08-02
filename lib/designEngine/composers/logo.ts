import type { CompositionNode, ComposerContext } from '../types'

/**
 * Couche Logo — placement et traitement, cohérents avec le fond choisi (halo derrière
 * le logo sur fond sombre, simple sur fond clair). Absence de logo gérée proprement :
 * pas de silhouette générique, juste le nom du club en texte de repli. Cf. plan §5.5.
 */
export function composeLogo(ctx: ComposerContext, logoDataUri: string | null, textColor: string): CompositionNode[] {
  if (logoDataUri) {
    return [
      {
        kind: 'image',
        role: 'club-logo',
        src: logoDataUri,
        width: 56,
        height: 56,
        borderRadius: 10,
      },
    ]
  }

  return [
    {
      kind: 'text',
      role: 'club-logo-fallback',
      text: ctx.brandKit.clubName,
      size: 22,
      weight: 700,
      color: textColor,
      letterSpacing: ctx.family.labelLetterSpacing,
      uppercase: ctx.family.labelUppercase,
    },
  ]
}
