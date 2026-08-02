import type { PostVisualKind } from '@/lib/visualLayout'

const LEVELS = ['low', 'medium', 'high'] as const
type Level = typeof LEVELS[number]

const RECOMMENDABLE_TEMPLATES: PostVisualKind[] = [
  'tournament', 'schedule', 'seasonRecap', 'matchAnnouncement', 'playerSpotlight', 'clubAnnouncement', 'engagementPoll', 'customPost',
]

export type ReferenceAnalysis = {
  colors: string[]
  contrast: Level | null
  density: Level | null
  photoImportance: Level | null
  textQuantity: Level | null
  mood: string | null
  logoPlacement: string | null
  recommendedTemplate: PostVisualKind | null
}

export type CharterAnalysis = {
  colors: string[]
  toneIndications: string | null
  logoDetected: boolean
  typography: string | null
  source: 'image' | 'pdf-text-only'
}

function str(v: unknown, maxLen = 300): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, maxLen) : null
}
function level(v: unknown): Level | null {
  return typeof v === 'string' && (LEVELS as readonly string[]).includes(v) ? (v as Level) : null
}
function hexColors(v: unknown, max = 5): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((c): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, max)
}
function template(v: unknown): PostVisualKind | null {
  return typeof v === 'string' && (RECOMMENDABLE_TEMPLATES as string[]).includes(v) ? (v as PostVisualKind) : null
}

/** Validation stricte de la sortie modèle avant tout usage — jamais une confiance aveugle dans le JSON renvoyé. Pure, sans dépendance réseau. */
export function parseReferenceAnalysis(raw: unknown): ReferenceAnalysis {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    colors: hexColors(r.colors),
    contrast: level(r.contrast),
    density: level(r.density),
    photoImportance: level(r.photoImportance),
    textQuantity: level(r.textQuantity),
    mood: str(r.mood, 80),
    logoPlacement: str(r.logoPlacement, 80),
    recommendedTemplate: template(r.recommendedTemplate),
  }
}

export function parseCharterAnalysis(raw: unknown, source: CharterAnalysis['source']): CharterAnalysis {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    colors: source === 'pdf-text-only' ? [] : hexColors(r.colors),
    toneIndications: str(r.toneIndications, 300),
    logoDetected: source === 'pdf-text-only' ? false : r.logoDetected === true,
    typography: str(r.typography, 80),
    source,
  }
}
