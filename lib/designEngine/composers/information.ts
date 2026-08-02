import type { CompositionNode, ComposerContext } from '../types'
import type { TypographyResult } from './typography'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function resultLabel(homeScore: number, awayScore: number, isHome: boolean): string {
  const us = isHome ? homeScore : awayScore
  const them = isHome ? awayScore : homeScore
  if (us > them) return 'Victoire'
  if (us < them) return 'Défaite'
  return 'Match nul'
}

export type InformationResult = {
  hero: CompositionNode
  primary: CompositionNode[]
  secondary: CompositionNode[]
  tertiary: CompositionNode[]
}

/**
 * Couche Informations — assemble le texte réel du contenu dans les tailles déjà
 * résolues par la couche Typography. Ne prend aucune décision de mise en page :
 * uniquement du texte, aux couleurs et tailles qu'on lui donne. Cf. plan §5.5.
 */
export function composeInformation(
  ctx: ComposerContext,
  typo: TypographyResult,
  textOnAccent: string,
  textOnPage: string,
): InformationResult {
  const { content, family } = ctx
  const score = `${content.homeScore}–${content.awayScore}`
  const result = resultLabel(content.homeScore, content.awayScore, content.isHome)
  const opponentLine = content.isHome ? `${content.clubName} — ${content.opponent}` : `${content.opponent} — ${content.clubName}`

  const hero: CompositionNode = {
    kind: 'text',
    role: 'score',
    text: score,
    size: typo.hero,
    weight: 900,
    color: textOnAccent,
    lineHeight: 1,
    // Dynamic assume un léger tilt sur le score — les autres familles restent bien droites.
    rotation: family.id === 'dynamic' ? -3 : undefined,
  }

  const primary: CompositionNode[] = [
    {
      kind: 'text',
      role: 'opponent',
      text: opponentLine,
      size: typo.primary,
      weight: 700,
      color: textOnAccent,
      lineHeight: 1.1,
    },
    {
      kind: 'text',
      role: 'result',
      text: result,
      size: typo.secondary,
      weight: 400,
      color: textOnAccent,
      letterSpacing: family.labelLetterSpacing,
      uppercase: family.labelUppercase,
    },
  ]

  const secondary: CompositionNode[] = content.competition
    ? [
        {
          kind: 'text',
          role: 'competition',
          text: content.competition,
          size: typo.secondary,
          weight: 400,
          color: textOnPage,
          letterSpacing: family.labelLetterSpacing,
          uppercase: family.labelUppercase,
        },
      ]
    : []

  const tertiary: CompositionNode[] = [
    {
      kind: 'text',
      role: 'date',
      text: formatDate(content.date),
      size: typo.tertiary,
      weight: 400,
      color: textOnPage,
    },
  ]

  return { hero, primary, secondary, tertiary }
}
