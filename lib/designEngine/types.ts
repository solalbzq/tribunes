// Design Engine — types fondamentaux. Ce module ne dépend jamais de lib/visualLayout.ts
// (moteur actuel) : c'est une expérimentation totalement isolée, cf. docs/design-engine-plan.md.

/** Format de sortie — pour l'instant un seul, le prototype se concentre sur la composition, pas le multi-format. */
export const CANVAS_WIDTH = 1080
export const CANVAS_HEIGHT = 1350

/** Contenu brut du type "Résultat de match" — ce que le pipeline IA/formulaire produit déjà aujourd'hui. */
export type MatchResultContent = {
  clubName: string
  opponent: string
  homeScore: number
  awayScore: number
  isHome: boolean
  competition: string | null
  date: string // ISO
}

/**
 * Hiérarchie d'importance déclarée pour un type de contenu — remplace le "chaque type
 * a sa fonction de dessin dédiée" du moteur actuel par une donnée que les composers
 * (Typography, Grid) interprètent. Un champ = un rôle d'importance, jamais une position.
 */
export type ContentBlueprint = {
  hero: string
  primary: string[]
  secondary: string[]
  tertiary: string[]
}

/** Identité de marque — volontairement plus large que ce qui est exploité aujourd'hui (cf. §5.4 du plan). */
export type BrandKit = {
  // Utilisé dès ce prototype
  clubName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  signature: SignatureToken

  // Réservé pour une évolution future — non exploité par les composers du prototype,
  // mais déjà lu dans son intégralité par le contexte pour qu'aucune future extension
  // n'exige de changer la signature des composers.
  secondaryPalette?: string[]
  typography?: { headingFamily?: string; bodyFamily?: string }
  graphicStyle?: string
  personality?: { energy?: number; formality?: number }
  texture?: string
  patterns?: string[]
  shapeLanguage?: string
  borderStyle?: string
  iconStyle?: string
  photoTreatment?: string
}

/** Motif de reconnaissance persistant du club — toujours présent, jamais absent d'une composition. */
export type SignatureToken = {
  motif: 'underline' | 'corner-dot' | 'diagonal-bar'
  angle: number // degrés, variation subtile par club
}

export type DesignFamilyId = 'minimal' | 'editorial'

/** Jeu de tokens partagé par tous les composers pour une famille — pas de code séparé par famille. */
export type FamilyTokens = {
  id: DesignFamilyId
  label: string
  margin: number // marge extérieure en px sur canvas 1080×1350
  heroScale: number // multiplicateur appliqué à la taille de base du champ "hero"
  labelLetterSpacing: number
  labelUppercase: boolean
  backgroundVariants: BackgroundVariantId[]
  gridVariants: GridVariantId[]
}

export type BackgroundVariantId = 'solid' | 'gradient-halo' | 'accent-block'
export type GridVariantId = 'centered' | 'top-weighted' | 'bottom-weighted' | 'accent-split'

/**
 * Arbre de composition — la sortie du Composition Engine. Vocabulaire volontairement
 * plus abstrait que du CSS : c'est le Renderer (satoriRenderer.ts) qui traduit ceci en
 * arbre satori/CSS, jamais l'inverse. Aucune décision de design ne doit apparaître dans
 * le renderer, et aucun détail de rendu ne doit apparaître ici.
 */
export type CompositionNode =
  | FrameNode
  | TextNode
  | ImageNode
  | ShapeNode

/** Positionnement hors flux — réservé aux décorations de fond (halo, bloc d'accent) placées derrière le contenu. */
export type AbsoluteInset = { top?: number; left?: number; right?: number; bottom?: number }

export type FrameNode = {
  kind: 'frame'
  role: string
  direction: 'row' | 'column'
  align: 'start' | 'center' | 'end' | 'stretch'
  justify: 'start' | 'center' | 'end' | 'space-between'
  gap: number
  padding: number
  grow: number
  width?: number
  height?: number
  background?: { color: string; opacity?: number }
  borderRadius?: number
  absolute?: AbsoluteInset
  rotation?: number
  children: CompositionNode[]
}

export type TextNode = {
  kind: 'text'
  role: string
  text: string
  size: number
  weight: 400 | 700 | 900
  color: string
  letterSpacing?: number
  uppercase?: boolean
  lineHeight?: number
}

export type ImageNode = {
  kind: 'image'
  role: string
  src: string
  width: number
  height: number
  borderRadius?: number
  opacity?: number
}

export type ShapeNode = {
  kind: 'shape'
  role: string
  shape: 'line' | 'dot'
  color: string
  width: number
  height: number
  rotation?: number
  absolute?: AbsoluteInset
  opacity?: number
}

export type ComposerContext = {
  content: MatchResultContent
  blueprint: ContentBlueprint
  brandKit: BrandKit
  family: FamilyTokens
  rng: () => number
}

export type Composition = {
  width: number
  height: number
  root: FrameNode
}
