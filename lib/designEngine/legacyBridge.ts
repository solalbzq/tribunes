// Pont vers l'éditeur existant — le Design Engine ne remplace pas l'éditeur
// drag & drop (VisualEditor/PostVisualEditor, non modifiés, cf. isolation dans
// docs/design-engine-plan.md) : il propose un point de départ stylé selon la
// famille choisie, que le club édite ensuite librement comme aujourd'hui.
//
// Choix délibéré : ne repositionne PAS les éléments cœur existants (déjà bien
// réglés, verrouillés dans l'éditeur) — ne fait varier que ce qui est sûr de
// varier sans casser une mise en page : fond, police, et un accent de
// signature ajouté en élément libre (comme le fait déjà un club manuellement
// via "Ajouter un élément").

import type { LayoutElement, VisualConfig, VisualFormat, PostVisualConfig, PostVisualElement, PostVisualKind } from '@/lib/visualLayout'
import { defaultElementsFor, defaultPostVisualElements } from '@/lib/visualLayout'
import type { DesignFamilyId } from './types'
import { deriveSignature } from './brandKit'
import { darken, mix, vivid } from './color'

const FAMILY_FONT: Record<DesignFamilyId, string> = {
  minimal: '',
  editorial: 'Georgia, serif',
  bold: 'Impact, sans-serif',
  premium: '"Times New Roman", serif',
  dynamic: '"Trebuchet MS", sans-serif',
}

function familyBackgroundColor(family: DesignFamilyId, primaryColor: string): string | undefined {
  if (family === 'bold') return vivid(primaryColor)
  if (family === 'editorial' || family === 'dynamic') return mix('#0a0a0c', primaryColor, 0.14)
  if (family === 'premium') return darken(mix('#0a0a0c', primaryColor, 0.05), 0.1)
  return undefined // minimal : dégradé par défaut du club, inchangé
}

/** Champs communs aux deux vocabulaires d'éléments (LayoutElement et PostVisualElement partagent ce sous-ensemble pour le type 'line'). */
function signatureLineFields(clubId: string, secondaryColor: string, box: { x: number; y: number; w: number }) {
  const { angle } = deriveSignature(clubId)
  return {
    id: `signature_${Date.now()}`,
    type: 'line' as const,
    x: box.x, y: box.y, w: Math.min(140, box.w), h: 6,
    visible: true, fontSize: 1, opacity: 1,
    color: secondaryColor,
    rotation: angle,
    strokeWidth: 6,
  }
}

/**
 * Propose une configuration de départ pour le Résultat de match (système
 * LayoutElement/VisualConfig), à charger dans VisualEditor. N'ajoute qu'un
 * accent de signature — les 5 éléments cœur gardent leurs positions par défaut.
 */
export function proposeMatchResultVisualConfig(params: {
  family: DesignFamilyId
  format: VisualFormat
  clubId: string
  secondaryColor: string
}): VisualConfig {
  const { family, format, clubId, secondaryColor } = params
  const base = defaultElementsFor(format).map(el => ({ ...el, fontFamily: FAMILY_FONT[family] || undefined }))
  const scoreBlock = base.find(e => e.type === 'scoreBlock')
  const accent: LayoutElement = signatureLineFields(clubId, secondaryColor, {
    x: scoreBlock?.x ?? 64,
    y: (scoreBlock ? scoreBlock.y - 30 : 370),
    w: scoreBlock?.w ?? 952,
  })
  return { bgOpacity: 0.75, elements: [...base, accent] }
}

/**
 * Équivalent pour les 7 types génériques (système PostVisualElement/Config),
 * à charger dans PostVisualEditor. Fait aussi varier le fond (dégradé/uni),
 * ce que le système Résultat ne permet pas.
 */
export function proposePostVisualConfig(params: {
  kind: PostVisualKind
  family: DesignFamilyId
  format: VisualFormat
  clubId: string
  primaryColor: string
  secondaryColor: string
}): PostVisualConfig {
  const { kind, family, format, clubId, primaryColor, secondaryColor } = params
  const base = defaultPostVisualElements(kind, format).map(el => ({ ...el, fontFamily: FAMILY_FONT[family] || undefined }))
  const heading = base.find((e: PostVisualElement) => e.type === 'heading') ?? base[0]
  const accent: PostVisualElement = signatureLineFields(clubId, secondaryColor, {
    x: heading?.x ?? 64,
    y: (heading ? heading.y + heading.h + 18 : 300),
    w: heading?.w ?? 300,
  })

  const bgColor = familyBackgroundColor(family, primaryColor)
  return {
    elements: [...base, accent],
    background: bgColor ? { type: 'solid', color: bgColor, overlayOpacity: 1 } : { type: 'gradient', overlayOpacity: 1 },
  }
}
