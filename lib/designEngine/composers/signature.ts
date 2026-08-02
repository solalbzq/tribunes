import type { CompositionNode, ComposerContext } from '../types'

export type SignatureResult = {
  node: CompositionNode
  placement: 'inline-hero' | 'absolute'
}

/**
 * Couche Signature — le motif de reconnaissance du club, toujours présent (jamais une
 * variante "aucune signature"), stable dans le temps (dérivé de l'id club, pas du
 * contenu ni d'une graine aléatoire — cf. brandKit.ts). C'est ce qui doit permettre à
 * un abonné de reconnaître une publication du club sans lire le logo. Cf. plan §5.5.
 */
export function composeSignature(ctx: ComposerContext, textOnPage: string): SignatureResult {
  const { brandKit } = ctx
  const { motif, angle } = brandKit.signature

  if (motif === 'underline') {
    return {
      placement: 'inline-hero',
      node: {
        kind: 'shape',
        role: 'signature-underline',
        shape: 'line',
        color: brandKit.secondaryColor,
        width: 84,
        height: 6,
        rotation: angle,
      },
    }
  }

  if (motif === 'corner-dot') {
    return {
      placement: 'absolute',
      node: {
        kind: 'shape',
        role: 'signature-dot',
        shape: 'dot',
        color: brandKit.secondaryColor,
        width: 22,
        height: 22,
        absolute: { bottom: 56, right: 56 },
      },
    }
  }

  // diagonal-bar
  return {
    placement: 'absolute',
    node: {
      kind: 'shape',
      role: 'signature-diagonal-bar',
      shape: 'line',
      color: brandKit.secondaryColor,
      width: 120,
      height: 8,
      rotation: 45 + angle,
      absolute: { bottom: 64, right: -20 },
      opacity: 0.9,
    },
  }
  // textOnPage réservé pour une future variante texte (ex. devise du club) — non utilisée en V1.
  void textOnPage
}
