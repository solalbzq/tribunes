import type { ContentBlueprint, MatchResultContent } from '../types'

/**
 * Le score est le "hero" — l'information que le club veut voir en premier. L'adversaire
 * et le résultat (V/N/D) sont primaires, compétition/date secondaires. Rien ici n'est
 * une position ou une taille : c'est un rang d'importance, résolu ensuite par le
 * composer Typography. Cf. plan §5.3.
 */
export function buildMatchResultBlueprint(_content: MatchResultContent): ContentBlueprint {
  return {
    hero: 'score',
    primary: ['opponent', 'result'],
    secondary: ['competition'],
    tertiary: ['date'],
  }
}
