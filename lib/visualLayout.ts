export type ElementType =
  | 'sport' | 'clubName' | 'logo' | 'scoreBlock' | 'footer'
  | 'text' | 'rect' | 'circle' | 'line'

export type LayoutElement = {
  id: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number
  visible: boolean
  // Text & size
  fontSize: number      // multiplier, 1 = default
  text?: string         // for 'text' type
  fontFamily?: string   // ex: 'Inter, sans-serif' — vide = police par défaut
  // Colors & opacity
  color: string         // fill / text color
  secondaryColor?: string
  opacity: number       // 0–1 for the element itself
  // Shapes
  borderRadius?: number
  strokeColor?: string
  strokeWidth?: number
  // Transform & effects
  rotation?: number     // degrés, sens horaire
  shadowBlur?: number   // px, 0/undefined = pas d'ombre portée
  // Logo-specific
  logoShowBg?: boolean  // false = no background bubble
  // Footer-specific (fonctionnalité Premium — cf. sanitizeFooterForPlan)
  footerVariant?: 'brand' | 'clubName'
}

export type VisualConfig = {
  bgOpacity: number     // opacity of background photo (0–1)
  elements: LayoutElement[]
}

/** Format d'export d'un visuel : post (carré/portrait classique) ou story verticale (9:16, ex: Instagram Stories). */
export type VisualFormat = 'post' | 'story'

export const SIZE = 1080
export const STORY_SIZE = { W: 1080, H: 1920 }

/** Dimensions du canvas selon le format — la largeur (1080) est commune aux deux formats, seule la hauteur change. */
export function canvasSizeFor(format: VisualFormat): { w: number; h: number } {
  return format === 'story' ? { w: STORY_SIZE.W, h: STORY_SIZE.H } : { w: SIZE, h: SIZE }
}

export const DEFAULT_FONT_FAMILIES = [
  { label: 'Inter (défaut)', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
]

/**
 * Thèmes prédéfinis (police + style de fond), applicables en un clic. Ne
 * touchent jamais la géométrie (x/y/w/h) ni les couleurs de marque du club —
 * uniquement la police de tous les éléments et, pour le système générique,
 * le style de fond (dégradé/uni).
 */
export type VisualTheme = { label: string; fontFamily: string; backgroundType: 'gradient' | 'solid' }
export const VISUAL_THEMES: VisualTheme[] = [
  { label: 'Classique', fontFamily: '', backgroundType: 'gradient' },
  { label: 'Élégant', fontFamily: 'Georgia, serif', backgroundType: 'solid' },
  { label: 'Impact', fontFamily: 'Impact, sans-serif', backgroundType: 'gradient' },
  { label: 'Moderne', fontFamily: '"Trebuchet MS", sans-serif', backgroundType: 'solid' },
]

/** Applique la police d'un thème à une liste d'éléments, sans toucher au reste. */
export function applyThemeFontFamily<T extends { fontFamily?: string }>(elements: T[], theme: VisualTheme): T[] {
  return elements.map(e => ({ ...e, fontFamily: theme.fontFamily || undefined }))
}

/**
 * Personnalisation du bandeau de bas de visuel (masquer / remplacer par le nom
 * du club) — fonctionnalité Premium. Appelé côté serveur (app/api/clubs/route.ts)
 * avant toute sauvegarde pour garantir l'application du plan même si le client
 * envoie un payload différent de ce que l'UI propose.
 */
export function sanitizeFooterElements<T extends { type: string; visible: boolean; footerVariant?: 'brand' | 'clubName' }>(
  elements: T[],
  isPremium: boolean
): T[] {
  if (isPremium) return elements
  return elements.map(e => (e.type === 'footer' ? { ...e, visible: true, footerVariant: undefined } : e))
}

function fontOf(el: { fontFamily?: string }): string {
  return el.fontFamily && el.fontFamily.trim() ? el.fontFamily : 'Inter, sans-serif'
}

/** Applique rotation (autour du centre de l'élément) et ombre portée avant le dessin ; à appeler juste après `ctx.save()`. */
function applyTransformAndShadow(
  ctx: CanvasRenderingContext2D,
  el: { x: number; y: number; w: number; h: number; rotation?: number; shadowBlur?: number }
) {
  if (el.rotation) {
    const cx = el.x + el.w / 2
    const cy = el.y + el.h / 2
    ctx.translate(cx, cy)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }
  if (el.shadowBlur) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = el.shadowBlur
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = Math.round(el.shadowBlur * 0.25)
  }
}

export const DEFAULT_ELEMENTS: LayoutElement[] = [
  {
    id: 'sport', type: 'sport',
    x: 64, y: 70, w: 700, h: 45,
    visible: true, fontSize: 1, opacity: 1,
    color: '#e94560',
  },
  {
    id: 'clubName', type: 'clubName',
    x: 64, y: 115, w: 750, h: 80,
    visible: true, fontSize: 1, opacity: 1,
    color: '#ffffff',
  },
  {
    id: 'logo', type: 'logo',
    x: 876, y: 55, w: 140, h: 140,
    visible: true, fontSize: 1, opacity: 1,
    color: '#ffffff', logoShowBg: true,
  },
  {
    id: 'scoreBlock', type: 'scoreBlock',
    x: 64, y: 400, w: 952, h: 360,
    visible: true, fontSize: 1, opacity: 1,
    color: '#ffffff',
  },
  {
    id: 'footer', type: 'footer',
    x: 0, y: 988, w: 1080, h: 92,
    visible: true, fontSize: 1, opacity: 1,
    color: '#e94560',
  },
]

/** Mise en page par défaut du format Story (1080×1920) — mêmes éléments cœur, repositionnés pour la hauteur disponible. */
export const DEFAULT_STORY_ELEMENTS: LayoutElement[] = [
  {
    id: 'sport', type: 'sport',
    x: 64, y: 160, w: 700, h: 45,
    visible: true, fontSize: 1, opacity: 1,
    color: '#e94560',
  },
  {
    id: 'clubName', type: 'clubName',
    x: 64, y: 205, w: 900, h: 90,
    visible: true, fontSize: 1, opacity: 1,
    color: '#ffffff',
  },
  {
    id: 'logo', type: 'logo',
    x: 850, y: 150, w: 150, h: 150,
    visible: true, fontSize: 1, opacity: 1,
    color: '#ffffff', logoShowBg: true,
  },
  {
    id: 'scoreBlock', type: 'scoreBlock',
    x: 64, y: 830, w: 952, h: 420,
    visible: true, fontSize: 1, opacity: 1,
    color: '#ffffff',
  },
  {
    id: 'footer', type: 'footer',
    x: 0, y: 1828, w: 1080, h: 92,
    visible: true, fontSize: 1, opacity: 1,
    color: '#e94560',
  },
]

export const DEFAULT_CONFIG: VisualConfig = {
  bgOpacity: 0.75,
  elements: DEFAULT_ELEMENTS,
}

export function defaultElementsFor(format: VisualFormat): LayoutElement[] {
  return format === 'story' ? DEFAULT_STORY_ELEMENTS : DEFAULT_ELEMENTS
}

export function parseVisualConfig(raw: unknown, format: VisualFormat = 'post'): VisualConfig {
  const defaults = defaultElementsFor(format)
  if (!raw) return { bgOpacity: 0.75, elements: defaults }
  // Old format: array of elements
  if (Array.isArray(raw)) {
    return { bgOpacity: 0.75, elements: mergeElementsWithDefaults(raw as LayoutElement[], defaults) }
  }
  // New format: VisualConfig object
  const cfg = raw as Partial<VisualConfig>
  return {
    bgOpacity: cfg.bgOpacity ?? 0.75,
    elements: mergeElementsWithDefaults(cfg.elements ?? [], defaults),
  }
}

/** Config résultat de match multi-format : `{ post, story }`, avec migration rétro-compatible de l'ancienne forme plate (qui devient `post`). */
export type VisualConfigByFormat = { post: VisualConfig; story: VisualConfig }

function isByFormatShape(raw: unknown): raw is { post?: unknown; story?: unknown } {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw) && ('post' in (raw as object) || 'story' in (raw as object))
}

export function parseVisualConfigByFormat(raw: unknown): VisualConfigByFormat {
  if (isByFormatShape(raw)) {
    const r = raw as { post?: unknown; story?: unknown }
    return {
      post: parseVisualConfig(r.post, 'post'),
      story: parseVisualConfig(r.story, 'story'),
    }
  }
  // Ancienne forme plate (ou absente) : c'est la config "post" ; la story démarre sur ses valeurs par défaut.
  return {
    post: parseVisualConfig(raw, 'post'),
    story: { bgOpacity: 0.75, elements: DEFAULT_STORY_ELEMENTS },
  }
}

function mergeElementsWithDefaults(saved: LayoutElement[], defaults: LayoutElement[] = DEFAULT_ELEMENTS): LayoutElement[] {
  const savedMap = new Map(saved.map(e => [e.id, e]))
  // Start from defaults, overlay saved values for known elements
  const merged = defaults.map(def => {
    const s = savedMap.get(def.id)
    return s ? { ...def, ...s } : def
  })
  // Append custom elements (not in defaults)
  const defaultIds = new Set(defaults.map(e => e.id))
  saved.filter(e => !defaultIds.has(e.id)).forEach(e => merged.push(e))
  return merged
}

export function textColor(hex: string): string {
  if (!hex || hex.length < 7) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff'
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ─────────────────────────────────────────────────────────────────────────
// Guides d'alignement / snapping — partagé par les éditeurs canvas (résultat
// de match et types génériques). Opère sur de la géométrie brute, sans
// connaître LayoutElement/PostVisualElement, pour rester réutilisable.
// ─────────────────────────────────────────────────────────────────────────

export type SnapBox = { x: number; y: number; w: number; h: number }
export type SnapGuide = { axis: 'v' | 'h'; pos: number }

export const SNAP_THRESHOLD = 6

/**
 * Calcule la position accrochée (snap) d'un élément en cours de déplacement, au
 * centre du canvas et/ou aux bords/centres des autres éléments, avec les guides
 * visuels correspondants à afficher pendant le drag.
 */
export function computeSnap(
  box: SnapBox,
  others: SnapBox[],
  canvasW: number,
  canvasH: number,
  threshold: number = SNAP_THRESHOLD
): { x: number; y: number; guides: SnapGuide[] } {
  let x = box.x
  let y = box.y
  const guides: SnapGuide[] = []

  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const canvasCx = canvasW / 2
  const canvasCy = canvasH / 2

  if (Math.abs(cx - canvasCx) <= threshold) {
    x = canvasCx - box.w / 2
    guides.push({ axis: 'v', pos: canvasCx })
  }
  if (Math.abs(cy - canvasCy) <= threshold) {
    y = canvasCy - box.h / 2
    guides.push({ axis: 'h', pos: canvasCy })
  }

  for (const other of others) {
    const ocx = other.x + other.w / 2
    const ocy = other.y + other.h / 2

    if (!guides.some(g => g.axis === 'v')) {
      if (Math.abs(cx - ocx) <= threshold) {
        x = ocx - box.w / 2
        guides.push({ axis: 'v', pos: ocx })
      } else if (Math.abs(box.x - other.x) <= threshold) {
        x = other.x
        guides.push({ axis: 'v', pos: other.x })
      } else if (Math.abs(box.x + box.w - (other.x + other.w)) <= threshold) {
        x = other.x + other.w - box.w
        guides.push({ axis: 'v', pos: other.x + other.w })
      }
    }
    if (!guides.some(g => g.axis === 'h')) {
      if (Math.abs(cy - ocy) <= threshold) {
        y = ocy - box.h / 2
        guides.push({ axis: 'h', pos: ocy })
      } else if (Math.abs(box.y - other.y) <= threshold) {
        y = other.y
        guides.push({ axis: 'h', pos: other.y })
      } else if (Math.abs(box.y + box.h - (other.y + other.h)) <= threshold) {
        y = other.y + other.h - box.h
        guides.push({ axis: 'h', pos: other.y + other.h })
      }
    }
  }

  return { x, y, guides }
}

/** Dessine les lignes de guidage actives (appelé après le dessin des éléments, avant l'overlay de sélection). */
export function drawSnapGuides(ctx: CanvasRenderingContext2D, guides: SnapGuide[], canvasW: number, canvasH: number) {
  ctx.save()
  ctx.strokeStyle = '#f43f5e'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 6])
  for (const g of guides) {
    ctx.beginPath()
    if (g.axis === 'v') {
      ctx.moveTo(g.pos, 0)
      ctx.lineTo(g.pos, canvasH)
    } else {
      ctx.moveTo(0, g.pos)
      ctx.lineTo(canvasW, g.pos)
    }
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Filigrane "Tribunes" (plan gratuit) : discret, bas droite, lisible sur tout
 * fond. `offsetBottom` permet de remonter au-dessus d'un footer éventuel.
 */
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  size: number,
  offsetBottom = 0
) {
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.font = `800 ${Math.round(size * 0.026)}px Inter, sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffffff'
  ctx.fillText('⚡ Tribunes', size - 28, size - offsetBottom - 20)
  ctx.restore()
}

// Shared draw function used by both VisualEditor and VisualGenerator
export type DrawMatchData = {
  clubName: string
  sport: string
  secondaryColor: string
  logoImg: HTMLImageElement | null
  opponent: string
  clubScore: number
  oppScore: number
  result: string
  competition: string
  detailLines?: string[]   // e.g. quarters, sets detail
  scoreLabel?: string      // e.g. "SETS" for volleyball
}

export function drawElements(
  ctx: CanvasRenderingContext2D,
  elements: LayoutElement[],
  match: DrawMatchData
) {
  for (const el of elements) {
    if (!el.visible) continue
    const { x, y, w, h, fontSize, opacity, color } = el
    ctx.save()
    ctx.globalAlpha = opacity
    applyTransformAndShadow(ctx, el)

    if (el.type === 'sport') {
      ctx.fillStyle = color
      ctx.font = `600 ${Math.round(28 * fontSize)}px ${fontOf(el)}`
      ctx.textBaseline = 'top'
      ctx.fillText(match.sport.toUpperCase(), x, y)
    }

    if (el.type === 'clubName') {
      ctx.fillStyle = color
      ctx.font = `800 ${Math.round(56 * fontSize)}px ${fontOf(el)}`
      ctx.textBaseline = 'top'
      ctx.fillText(match.clubName, x, y)
    }

    if (el.type === 'logo') {
      if (el.logoShowBg !== false) {
        roundRect(ctx, x, y, w, h, 22)
        ctx.fillStyle = 'rgba(255,255,255,0.10)'
        ctx.fill()
      }
      if (match.logoImg) {
        ctx.save()
        roundRect(ctx, x, y, w, h, el.logoShowBg !== false ? 22 : 0)
        ctx.clip()
        const pad = el.logoShowBg !== false ? 12 : 0
        const ratio = Math.min((w - pad * 2) / match.logoImg.width, (h - pad * 2) / match.logoImg.height)
        const lw = match.logoImg.width * ratio
        const lh = match.logoImg.height * ratio
        ctx.drawImage(match.logoImg, x + (w - lw) / 2, y + (h - lh) / 2, lw, lh)
        ctx.restore()
      }
    }

    if (el.type === 'scoreBlock') {
      const midX = x + w / 2
      const hasDetails = match.detailLines && match.detailLines.length > 0
      roundRect(ctx, x, y, w, h, 32)
      ctx.fillStyle = 'rgba(255,255,255,0.09)'
      ctx.fill()

      // Badge résultat
      ctx.font = `800 ${Math.round(28 * fontSize)}px ${fontOf(el)}`
      const badgeW = ctx.measureText(match.result.toUpperCase()).width + 56
      roundRect(ctx, midX - badgeW / 2, y + 36, badgeW, 52, 26)
      ctx.fillStyle = match.secondaryColor
      ctx.fill()
      ctx.fillStyle = textColor(match.secondaryColor)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(match.result.toUpperCase(), midX, y + 62)

      // Score label (SETS / MATCHS)
      if (match.scoreLabel) {
        ctx.font = `600 ${Math.round(18 * fontSize)}px ${fontOf(el)}`
        ctx.fillStyle = color + '88'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(match.scoreLabel, midX, y + h * 0.48)
      }

      // Scores
      const scoreY = hasDetails ? y + h * 0.58 : y + h * 0.64
      ctx.font = `900 ${Math.round(130 * fontSize)}px ${fontOf(el)}`
      ctx.fillStyle = color
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${match.clubScore}`, midX - 140, scoreY)
      ctx.fillText('-', midX, scoreY - 6)
      ctx.fillText(`${match.oppScore}`, midX + 140, scoreY)

      // Labels équipes
      const labelY = hasDetails ? y + h * 0.70 : y + h * 0.80
      ctx.font = `600 ${Math.round(22 * fontSize)}px ${fontOf(el)}`
      ctx.fillStyle = match.secondaryColor
      ctx.fillText(match.clubName, midX - 140, labelY)
      ctx.fillText(match.opponent, midX + 140, labelY)

      // Detail lines (quarters / sets / buteurs / mi-temps)
      if (hasDetails) {
        const lines = match.detailLines!
        const lineH = Math.round(26 * fontSize)
        const totalH = lines.length * lineH
        const startY = y + h * 0.74
        ctx.font = `500 ${Math.round(20 * fontSize)}px ${fontOf(el)}`
        ctx.fillStyle = color + 'bb'
        lines.forEach((line, i) => {
          ctx.fillText(line, midX, startY + i * lineH)
        })
      }

      // Compétition
      ctx.font = `400 ${Math.round(20 * fontSize)}px ${fontOf(el)}`
      ctx.fillStyle = color + '88'
      ctx.fillText(match.competition || 'Match amical', midX, y + h - 22)
      ctx.textAlign = 'left'
    }

    if (el.type === 'footer') {
      ctx.fillStyle = color
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = textColor(color)
      ctx.font = `800 ${Math.round(26 * fontSize)}px ${fontOf(el)}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(el.footerVariant === 'clubName' ? match.clubName : '⚡ tribunes.app', x + 60, y + h / 2)
      if (el.footerVariant !== 'clubName') {
        ctx.font = `400 ${Math.round(20 * fontSize)}px ${fontOf(el)}`
        ctx.textAlign = 'right'
        ctx.fillText(
          `#${match.clubName.toLowerCase().replace(/\s/g, '')} #${match.sport.toLowerCase()}`,
          x + w - 60, y + h / 2
        )
      }
      ctx.textAlign = 'left'
    }

    // ── Custom elements
    if (el.type === 'text') {
      ctx.fillStyle = color
      ctx.font = `${Math.round(36 * fontSize)}px ${fontOf(el)}`
      ctx.textBaseline = 'top'
      ctx.fillText(el.text || 'Texte personnalisé', x, y)
    }

    if (el.type === 'rect') {
      roundRect(ctx, x, y, w, h, el.borderRadius ?? 0)
      ctx.fillStyle = color
      ctx.fill()
      if (el.strokeColor && el.strokeWidth) {
        ctx.strokeStyle = el.strokeColor
        ctx.lineWidth = el.strokeWidth
        ctx.stroke()
      }
    }

    if (el.type === 'circle') {
      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      if (el.strokeColor && el.strokeWidth) {
        ctx.strokeStyle = el.strokeColor
        ctx.lineWidth = el.strokeWidth
        ctx.stroke()
      }
    }

    if (el.type === 'line') {
      ctx.beginPath()
      ctx.moveTo(x, y + h / 2)
      ctx.lineTo(x + w, y + h / 2)
      ctx.strokeStyle = color
      ctx.lineWidth = el.strokeWidth ?? 4
      ctx.stroke()
    }

    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Système générique de visuels "post" — même principe que LayoutElement/
// drawElements ci-dessus (éléments positionnables en drag & drop), mais avec
// un vocabulaire d'éléments partagé entre les 7 types de post autres que
// Résultat (qui garde le système ci-dessus) et Tennis (système à part,
// posts/TennisVisualGenerator.tsx). Une même carte "12 formats génériques"
// (heading/subheading/paragraph/badge/matchList/statsBlock/vsBlock/infoBlock/
// photo/optionsList + logo/footer réutilisés) suffit à recomposer les 7 types.
// ─────────────────────────────────────────────────────────────────────────

export const POST_VISUAL_SIZE = { W: 1080, H: 1350 }
export const POST_VISUAL_STORY_SIZE = { W: 1080, H: 1920 }
const PW = POST_VISUAL_SIZE.W
const PH = POST_VISUAL_SIZE.H
const SPW = POST_VISUAL_STORY_SIZE.W
const SPH = POST_VISUAL_STORY_SIZE.H

/** Dimensions du canvas pour les 7 types génériques selon le format. */
export function postVisualCanvasSizeFor(format: VisualFormat): { w: number; h: number } {
  return format === 'story' ? { w: SPW, h: SPH } : { w: PW, h: PH }
}

export type PostVisualKind =
  | 'tournament' | 'schedule' | 'seasonRecap'
  | 'matchAnnouncement' | 'playerSpotlight' | 'clubAnnouncement' | 'engagementPoll'
  | 'customPost'

export type PostVisualElementType =
  | 'logo' | 'footer' | 'heading' | 'subheading' | 'paragraph' | 'badge'
  | 'matchList' | 'statsBlock' | 'vsBlock' | 'infoBlock' | 'photo' | 'optionsList'
  | 'text' | 'rect' | 'circle' | 'line'

export type PostVisualElement = {
  id: string
  type: PostVisualElementType
  x: number; y: number; w: number; h: number
  visible: boolean
  fontSize: number
  text?: string
  fontFamily?: string
  /** Chaîne vide = hérite dynamiquement de la couleur de marque du club (comportement par défaut). Une valeur = surcharge manuelle. */
  color: string
  opacity: number
  borderRadius?: number
  strokeColor?: string
  strokeWidth?: number
  rotation?: number
  shadowBlur?: number
  logoShowBg?: boolean
  /** Fonctionnalité Premium — cf. sanitizeFooterForPlan. */
  footerVariant?: 'brand' | 'clubName'
  /** Forme de recadrage pour un élément 'photo' (par défaut : 'circle'). */
  photoShape?: 'circle' | 'rounded' | 'square' | 'full'
}

/** Fond du visuel : dégradé (par défaut) ou couleur unie, avec une opacité de superposition réglable. */
export type PostVisualBackground = {
  type: 'gradient' | 'solid' | 'image'
  /** Couleur de base — vide = couleur primaire du club (comportement par défaut historique). */
  color?: string
  overlayOpacity?: number
  /** Photo de fond (type 'image'), hébergée sur le stockage du club. */
  imageUrl?: string
  /** Flou appliqué à la photo de fond, en px (0 = net). */
  blur?: number
}

export const DEFAULT_POST_VISUAL_BACKGROUND: PostVisualBackground = { type: 'gradient', overlayOpacity: 1 }

export type PostVisualConfig = { elements: PostVisualElement[]; background?: PostVisualBackground }

/** Éléments "cœur" (verrouillés, non supprimables) par type de post, dans l'ordre de dessin. */
export const POST_VISUAL_CORE_ELEMENTS: Record<PostVisualKind, PostVisualElementType[]> = {
  tournament: ['logo', 'heading', 'subheading', 'badge', 'matchList', 'footer'],
  schedule: ['logo', 'heading', 'subheading', 'badge', 'matchList', 'footer'],
  seasonRecap: ['logo', 'heading', 'subheading', 'badge', 'statsBlock', 'footer'],
  matchAnnouncement: ['badge', 'logo', 'vsBlock', 'infoBlock', 'footer'],
  playerSpotlight: ['badge', 'photo', 'heading', 'paragraph', 'footer'],
  clubAnnouncement: ['badge', 'logo', 'heading', 'paragraph', 'footer'],
  engagementPoll: ['badge', 'logo', 'heading', 'optionsList', 'footer'],
  // Publication libre (CUSTOM_POST) : même structure que "Annonce du club" par
  // défaut — hérite de son style tant qu'aucune variante propre n'est
  // enregistrée sous la clé 'customPost' de Club.postVisualConfigs (cf.
  // resolveCustomPostVisualKind ci-dessous).
  customPost: ['badge', 'logo', 'heading', 'paragraph', 'footer'],
}

export const POST_VISUAL_LABELS: Record<PostVisualElementType, string> = {
  logo: 'Logo', footer: 'Pied de page', heading: 'Titre', subheading: 'Sous-titre',
  paragraph: 'Texte', badge: 'Badge', matchList: 'Liste de matchs', statsBlock: 'Bloc statistiques',
  vsBlock: 'Face-à-face', infoBlock: 'Informations', photo: 'Photo', optionsList: 'Liste d\'options',
  text: 'Texte libre', rect: 'Rectangle', circle: 'Cercle', line: 'Ligne',
}

function el(type: PostVisualElementType, geo: Pick<PostVisualElement, 'x' | 'y' | 'w' | 'h'>, over: Partial<PostVisualElement> = {}): PostVisualElement {
  return { id: type, type, visible: true, fontSize: 1, opacity: 1, color: '', logoShowBg: type === 'logo' ? true : undefined, ...geo, ...over }
}

function listKindDefaults(): PostVisualElement[] {
  return [
    el('logo', { x: 480, y: 50, w: 120, h: 120 }),
    el('heading', { x: 0, y: 178, w: PW, h: 46 }),
    el('subheading', { x: 0, y: 230, w: PW, h: 30 }),
    el('badge', { x: 340, y: 264, w: 400, h: 56 }),
    el('matchList', { x: 54, y: 380, w: PW - 108, h: 756 }),
    el('footer', { x: 0, y: PH - 80, w: PW, h: 80 }),
  ]
}

const POST_VISUAL_DEFAULTS: Record<PostVisualKind, PostVisualElement[]> = {
  tournament: listKindDefaults(),
  schedule: listKindDefaults(),
  seasonRecap: [
    el('logo', { x: 480, y: 50, w: 120, h: 120 }),
    el('heading', { x: 0, y: 178, w: PW, h: 46 }),
    el('subheading', { x: 0, y: 230, w: PW, h: 30 }),
    el('badge', { x: 320, y: 264, w: 440, h: 56 }),
    el('statsBlock', { x: 54, y: 380, w: PW - 108, h: 420 }),
    el('footer', { x: 0, y: PH - 80, w: PW, h: 80 }),
  ],
  matchAnnouncement: [
    el('badge', { x: 280, y: 68, w: 520, h: 64 }),
    el('logo', { x: 475, y: 210, w: 130, h: 130 }),
    el('vsBlock', { x: 0, y: 380, w: PW, h: 300 }),
    el('infoBlock', { x: 0, y: 690, w: PW, h: 130 }),
    el('footer', { x: 0, y: PH - 80, w: PW, h: 80 }),
  ],
  playerSpotlight: [
    el('badge', { x: 340, y: 68, w: 400, h: 60 }),
    el('photo', { x: 360, y: 200, w: 360, h: 360 }),
    el('heading', { x: 0, y: 610, w: PW, h: 56 }),
    el('paragraph', { x: 0, y: 690, w: PW, h: 150 }),
    el('footer', { x: 0, y: PH - 80, w: PW, h: 80 }),
  ],
  clubAnnouncement: [
    el('badge', { x: 320, y: 88, w: 440, h: 60 }),
    el('logo', { x: 475, y: 200, w: 130, h: 130 }),
    el('heading', { x: 0, y: 370, w: PW, h: 110 }),
    el('paragraph', { x: 0, y: 500, w: PW, h: 190 }),
    el('footer', { x: 0, y: PH - 80, w: PW, h: 80 }),
  ],
  engagementPoll: [
    el('badge', { x: 340, y: 70, w: 340, h: 58 }),
    el('logo', { x: 485, y: 160, w: 110, h: 110 }),
    el('heading', { x: 0, y: 300, w: PW, h: 170 }),
    el('optionsList', { x: 90, y: 560, w: PW - 180, h: 460 }),
    el('footer', { x: 0, y: PH - 80, w: PW, h: 80 }),
  ],
  // Identique à clubAnnouncement par défaut (cf. POST_VISUAL_CORE_ELEMENTS.customPost).
  customPost: [
    el('badge', { x: 320, y: 88, w: 440, h: 60 }),
    el('logo', { x: 475, y: 200, w: 130, h: 130 }),
    el('heading', { x: 0, y: 370, w: PW, h: 110 }),
    el('paragraph', { x: 0, y: 500, w: PW, h: 190 }),
    el('footer', { x: 0, y: PH - 80, w: PW, h: 80 }),
  ],
}

function listKindStoryDefaults(): PostVisualElement[] {
  return [
    el('logo', { x: 480, y: 60, w: 140, h: 140 }),
    el('heading', { x: 0, y: 220, w: SPW, h: 56 }),
    el('subheading', { x: 0, y: 284, w: SPW, h: 34 }),
    el('badge', { x: 340, y: 330, w: 400, h: 60 }),
    el('matchList', { x: 54, y: 420, w: SPW - 108, h: 1360 }),
    el('footer', { x: 0, y: SPH - 90, w: SPW, h: 90 }),
  ]
}

const POST_VISUAL_STORY_DEFAULTS: Record<PostVisualKind, PostVisualElement[]> = {
  tournament: listKindStoryDefaults(),
  schedule: listKindStoryDefaults(),
  seasonRecap: [
    el('logo', { x: 480, y: 60, w: 140, h: 140 }),
    el('heading', { x: 0, y: 220, w: SPW, h: 56 }),
    el('subheading', { x: 0, y: 284, w: SPW, h: 34 }),
    el('badge', { x: 300, y: 330, w: 480, h: 60 }),
    el('statsBlock', { x: 54, y: 440, w: SPW - 108, h: 500 }),
    el('footer', { x: 0, y: SPH - 90, w: SPW, h: 90 }),
  ],
  matchAnnouncement: [
    el('badge', { x: 260, y: 110, w: 560, h: 68 }),
    el('logo', { x: 465, y: 280, w: 150, h: 150 }),
    el('vsBlock', { x: 0, y: 540, w: SPW, h: 400 }),
    el('infoBlock', { x: 0, y: 980, w: SPW, h: 160 }),
    el('footer', { x: 0, y: SPH - 90, w: SPW, h: 90 }),
  ],
  playerSpotlight: [
    el('badge', { x: 320, y: 110, w: 440, h: 64 }),
    el('photo', { x: 340, y: 260, w: 400, h: 400 }),
    el('heading', { x: 0, y: 700, w: SPW, h: 64 }),
    el('paragraph', { x: 0, y: 790, w: SPW, h: 220 }),
    el('footer', { x: 0, y: SPH - 90, w: SPW, h: 90 }),
  ],
  clubAnnouncement: [
    el('badge', { x: 300, y: 120, w: 480, h: 64 }),
    el('logo', { x: 465, y: 260, w: 150, h: 150 }),
    el('heading', { x: 0, y: 460, w: SPW, h: 130 }),
    el('paragraph', { x: 0, y: 610, w: SPW, h: 260 }),
    el('footer', { x: 0, y: SPH - 90, w: SPW, h: 90 }),
  ],
  engagementPoll: [
    el('badge', { x: 320, y: 100, w: 360, h: 62 }),
    el('logo', { x: 475, y: 200, w: 130, h: 130 }),
    el('heading', { x: 0, y: 370, w: SPW, h: 200 }),
    el('optionsList', { x: 90, y: 620, w: SPW - 180, h: 700 }),
    el('footer', { x: 0, y: SPH - 90, w: SPW, h: 90 }),
  ],
  // Identique à clubAnnouncement par défaut (cf. POST_VISUAL_CORE_ELEMENTS.customPost).
  customPost: [
    el('badge', { x: 300, y: 120, w: 480, h: 64 }),
    el('logo', { x: 465, y: 260, w: 150, h: 150 }),
    el('heading', { x: 0, y: 460, w: SPW, h: 130 }),
    el('paragraph', { x: 0, y: 610, w: SPW, h: 260 }),
    el('footer', { x: 0, y: SPH - 90, w: SPW, h: 90 }),
  ],
}

export function defaultPostVisualElements(kind: PostVisualKind, format: VisualFormat = 'post'): PostVisualElement[] {
  return format === 'story' ? POST_VISUAL_STORY_DEFAULTS[kind] : POST_VISUAL_DEFAULTS[kind]
}

function mergePostVisualElements(saved: PostVisualElement[], defaults: PostVisualElement[]): PostVisualElement[] {
  const savedMap = new Map(saved.map(e => [e.id, e]))
  const merged = defaults.map(def => {
    const s = savedMap.get(def.id)
    return s ? { ...def, ...s } : def
  })
  const defaultIds = new Set(defaults.map(e => e.id))
  saved.filter(e => !defaultIds.has(e.id)).forEach(e => merged.push(e))
  return merged
}

/** Config multi-format d'un type de post générique : `{ post, story }`. */
export type PostVisualConfigByFormat = { post: PostVisualConfig; story: PostVisualConfig }

/** Équivalent de parseVisualConfig() pour le système générique — fusionne la config sauvegardée d'un type de post avec ses éléments par défaut, pour un format donné. */
export function parsePostVisualConfig(raw: unknown, kind: PostVisualKind, format: VisualFormat = 'post'): PostVisualConfig {
  const defaults = defaultPostVisualElements(kind, format)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { elements: defaults }
  const entry = (raw as Record<string, unknown>)[kind]
  if (!entry || typeof entry !== 'object') return { elements: defaults }
  // Nouvelle forme imbriquée par format : { post: {elements,background}, story: {...} }
  if ('post' in entry || 'story' in entry) {
    const sub = (entry as Record<string, { elements?: PostVisualElement[]; background?: PostVisualBackground }>)[format]
    if (!sub || !Array.isArray(sub.elements)) return { elements: defaults, background: sub?.background }
    return { elements: mergePostVisualElements(sub.elements, defaults), background: sub.background }
  }
  // Ancienne forme plate (pas de nesting par format) : c'est la config "post".
  if (format === 'story') return { elements: defaults }
  const saved = (entry as { elements?: PostVisualElement[] }).elements
  if (!saved || !Array.isArray(saved)) return { elements: defaults }
  return { elements: mergePostVisualElements(saved, defaults) }
}

/**
 * Publication libre (CUSTOM_POST) : contrairement aux 6 autres types
 * génériques, elle n'a pas de style propre par défaut — elle hérite de
 * "Annonce du club" tant que le club n'a pas explicitement enregistré une
 * variante sous la clé 'customPost'. Détermine quelle clé de
 * `Club.postVisualConfigs` résoudre, pour que l'interface puisse afficher
 * la source réelle du style utilisé ("Personnalisé" vs "Annonce du club").
 */
export function hasCustomPostVisualOverride(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const entry = (raw as Record<string, unknown>).customPost
  if (!entry || typeof entry !== 'object') return false
  if ('post' in entry || 'story' in entry) {
    const sub = entry as Record<string, { elements?: unknown } | undefined>
    return Array.isArray(sub.post?.elements) || Array.isArray(sub.story?.elements)
  }
  return Array.isArray((entry as { elements?: unknown }).elements)
}

/** Clé à résoudre pour le rendu visuel d'une publication libre — 'customPost' si personnalisé, sinon 'clubAnnouncement'. */
export function resolveCustomPostVisualKind(raw: unknown): Extract<PostVisualKind, 'customPost' | 'clubAnnouncement'> {
  return hasCustomPostVisualOverride(raw) ? 'customPost' : 'clubAnnouncement'
}

/** Découpe un texte en lignes tenant dans `maxWidth`, jusqu'à `maxLines`. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines - 1) break
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  if (lines.length > maxLines) lines.length = maxLines
  return lines
}

function truncate(text: string, n: number): string {
  return text.length > n ? text.slice(0, n - 1) + '…' : text
}

/** `el.color` vide = hérite de `fallback` (couleur dynamique du club) ; une valeur = surcharge manuelle depuis l'éditeur. */
function resolveColor(elColor: string, fallback: string): string {
  return elColor && elColor.trim() ? elColor : fallback
}

export type PostVisualRow = { leftBadge: string; title: string; subtitle: string; rightBadge?: string; rightAccent?: boolean }
export type PostVisualStat = { label: string; value: string | number; color: string }

export type PostVisualContext = {
  clubName: string
  sport: string
  /** Couleur de contraste par rapport au fond (équivalent textColor(primaryColor)). */
  textColor: string
  secondaryColor: string
  logoImg: HTMLImageElement | null
  heading?: string
  subheading?: string
  paragraph?: string
  badge?: string
  rows?: PostVisualRow[]
  stats?: PostVisualStat[]
  statsCaption?: string
  statsNote?: string
  vs?: { left: string; right: string; badge?: string }
  infoLines?: string[]
  photo?: { img: HTMLImageElement | null; fallbackText: string }
  /** Photos multiples, dans l'ordre d'apparition des éléments 'photo' du calque. `photo` reste utilisé si présent et qu'aucune entrée n'existe pour l'index 0. */
  photos?: { img: HTMLImageElement | null; fallbackText: string }[]
  options?: string[]
}

/**
 * Dessine le fond d'un visuel générique : couleur de base (primaire du club, ou
 * surcharge `background.color`) + soit un dégradé fixe (comportement historique),
 * soit une couleur unie, module par `overlayOpacity`.
 */
export function drawPostVisualBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  background: PostVisualBackground | undefined,
  primaryColor: string,
  bgImage?: HTMLImageElement | null
) {
  const bg = background ?? DEFAULT_POST_VISUAL_BACKGROUND
  const baseColor = bg.color && bg.color.trim() ? bg.color : primaryColor
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, w, h)

  if (bg.type === 'image' && bgImage) {
    const ratio = Math.max(w / bgImage.width, h / bgImage.height)
    const iw = bgImage.width * ratio
    const ih = bgImage.height * ratio
    ctx.save()
    if (bg.blur) ctx.filter = `blur(${bg.blur}px)`
    ctx.drawImage(bgImage, (w - iw) / 2, (h - ih) / 2, iw, ih)
    ctx.restore()

    const darken = bg.overlayOpacity ?? 0.35
    if (darken > 0) {
      ctx.save()
      ctx.globalAlpha = darken
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
    return
  }

  const overlayOpacity = bg.overlayOpacity ?? 1
  if (overlayOpacity <= 0) return

  ctx.save()
  ctx.globalAlpha = overlayOpacity
  if (bg.type === 'solid') {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(0, 0, w, h)
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, 'rgba(255,255,255,0.04)')
    grad.addColorStop(1, 'rgba(0,0,0,0.2)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

/** Dessine les éléments d'un visuel générique (tournoi/programme/bilan/avant-match/joueur/annonce/sondage). */
export function drawPostVisualElements(
  ctx: CanvasRenderingContext2D,
  elements: PostVisualElement[],
  context: PostVisualContext
) {
  const sc = context.secondaryColor
  const tc = context.textColor
  let photoIndex = 0

  for (const item of elements) {
    if (!item.visible) continue
    const { x, y, w, h, fontSize, opacity, color } = item
    ctx.save()
    ctx.globalAlpha = opacity
    applyTransformAndShadow(ctx, item)

    if (item.type === 'logo') {
      const bubble = item.logoShowBg !== false
      if (bubble) {
        roundRect(ctx, x, y, w, h, Math.min(w, h) / 2)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fill()
      }
      if (context.logoImg) {
        ctx.save()
        roundRect(ctx, x, y, w, h, bubble ? Math.min(w, h) / 2 : 0)
        ctx.clip()
        const pad = bubble ? 16 : 0
        const ratio = Math.min((w - pad * 2) / context.logoImg.width, (h - pad * 2) / context.logoImg.height)
        const lw = context.logoImg.width * ratio
        const lh = context.logoImg.height * ratio
        ctx.drawImage(context.logoImg, x + (w - lw) / 2, y + (h - lh) / 2, lw, lh)
        ctx.restore()
      } else {
        ctx.fillStyle = resolveColor(color, tc)
        ctx.font = `${Math.round(Math.min(w, h) * 0.5)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('⚡', x + w / 2, y + h / 2)
      }
    }

    if (item.type === 'heading') {
      ctx.fillStyle = resolveColor(color, tc)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const text = item.text || context.heading || ''
      ctx.font = `900 ${Math.round(52 * fontSize)}px ${fontOf(item)}`
      ctx.fillText(truncate(text, 30), x + w / 2, y + h)
    }

    if (item.type === 'subheading') {
      ctx.fillStyle = resolveColor(color, sc)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const text = item.text || context.subheading || ''
      ctx.font = `600 ${Math.round(24 * fontSize)}px ${fontOf(item)}`
      ctx.fillText(text.toUpperCase(), x + w / 2, y + h)
    }

    if (item.type === 'paragraph') {
      ctx.fillStyle = resolveColor(color, sc)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const text = item.text || context.paragraph || ''
      const size = Math.round(28 * fontSize)
      ctx.font = `600 ${size}px ${fontOf(item)}`
      const lineH = size * 1.4
      const maxLines = Math.max(1, Math.floor(h / lineH))
      const lines = wrapText(ctx, text, w - 40, maxLines)
      const startY = y + lineH
      lines.forEach((line, i) => ctx.fillText(line, x + w / 2, startY + i * lineH))
    }

    if (item.type === 'badge') {
      const text = item.text || context.badge || ''
      const fill = resolveColor(color, sc)
      ctx.font = `800 ${Math.round(26 * fontSize)}px ${fontOf(item)}`
      roundRect(ctx, x, y, w, h, h / 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.fillStyle = textColor(fill)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, x + w / 2, y + h / 2 + 2)
    }

    if (item.type === 'matchList') {
      const rows = context.rows ?? []
      const rowH = 110
      const gap = 18
      const maxRows = Math.max(1, Math.min(6, Math.floor((h + gap) / (rowH + gap))))
      const textColorResolved = resolveColor(color, tc)
      rows.slice(0, maxRows).forEach((row, i) => {
        const ry = y + i * (rowH + gap)
        roundRect(ctx, x, ry, w, rowH, 20)
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)'
        ctx.fill()

        const lbW = 100
        roundRect(ctx, x + 20, ry + 15, lbW, rowH - 30, 14)
        ctx.fillStyle = sc + '33'
        ctx.fill()
        ctx.fillStyle = textColorResolved
        ctx.font = `900 ${Math.round(28 * fontSize)}px ${fontOf(item)}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(row.leftBadge || '—', x + 20 + lbW / 2, ry + rowH / 2)

        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = textColorResolved
        ctx.font = `700 ${Math.round(28 * fontSize)}px ${fontOf(item)}`
        ctx.fillText(truncate(row.title, 22), x + 20 + lbW + 22, ry + rowH * 0.52)
        ctx.font = `400 ${Math.round(19 * fontSize)}px ${fontOf(item)}`
        ctx.fillStyle = textColorResolved + 'aa'
        ctx.fillText(row.subtitle, x + 20 + lbW + 22, ry + rowH * 0.8)

        if (row.rightBadge) {
          ctx.font = `600 16px ${fontOf(item)}`
          const bw = ctx.measureText(row.rightBadge.toUpperCase()).width + 28
          const badgeColor = row.rightAccent ? sc : 'rgba(255,255,255,0.18)'
          roundRect(ctx, x + w - 20 - bw, ry + rowH / 2 - 16, bw, 32, 16)
          ctx.fillStyle = badgeColor
          ctx.fill()
          ctx.fillStyle = row.rightAccent ? textColor(sc) : textColorResolved
          ctx.textAlign = 'center'
          ctx.fillText(row.rightBadge.toUpperCase(), x + w - 20 - bw / 2, ry + rowH / 2 + 6)
        }
      })
    }

    if (item.type === 'statsBlock') {
      const stats = context.stats ?? []
      const colW = w / Math.max(stats.length, 1)
      const labelColor = resolveColor(color, tc)
      stats.forEach((s, i) => {
        const cx0 = x + i * colW
        roundRect(ctx, cx0 + 10, y, colW - 20, h, 24)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fill()
        const midX = cx0 + colW / 2
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.font = `900 ${Math.round(100 * fontSize)}px ${fontOf(item)}`
        ctx.fillStyle = s.color
        ctx.fillText(String(s.value), midX, y + h * 0.52)
        ctx.font = `700 ${Math.round(22 * fontSize)}px ${fontOf(item)}`
        ctx.fillStyle = labelColor
        ctx.fillText(s.label, midX, y + h * 0.66)
      })
      ctx.textAlign = 'center'
      if (context.statsCaption) {
        ctx.font = `500 22px ${fontOf(item)}`
        ctx.fillStyle = labelColor + 'aa'
        ctx.fillText(context.statsCaption, x + w / 2, y + h + 50)
      }
      if (context.statsNote) {
        ctx.font = `700 26px ${fontOf(item)}`
        ctx.fillStyle = sc
        ctx.fillText(truncate(context.statsNote, 48), x + w / 2, y + h + 110)
      }
    }

    if (item.type === 'vsBlock' && context.vs) {
      const midX = x + w / 2
      const vsColor = resolveColor(color, tc)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = tc
      ctx.font = `800 ${Math.round(50 * fontSize)}px ${fontOf(item)}`
      ctx.fillText(truncate(context.vs.left, 20), midX, y + h * 0.2)

      roundRect(ctx, midX - 46, y + h * 0.32, 92, 56, 28)
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.fill()
      ctx.fillStyle = vsColor
      ctx.font = `900 28px ${fontOf(item)}`
      ctx.fillText('VS', midX, y + h * 0.32 + 36)

      ctx.fillStyle = sc
      ctx.font = `800 ${Math.round(50 * fontSize)}px ${fontOf(item)}`
      ctx.fillText(truncate(context.vs.right, 20), midX, y + h * 0.68)

      if (context.vs.badge) {
        ctx.font = `600 20px ${fontOf(item)}`
        const bw = ctx.measureText(context.vs.badge).width + 40
        roundRect(ctx, midX - bw / 2, y + h * 0.86 - 22, bw, 44, 22)
        ctx.fillStyle = 'rgba(255,255,255,0.10)'
        ctx.fill()
        ctx.fillStyle = tc
        ctx.fillText(context.vs.badge, midX, y + h * 0.86 + 6)
      }
    }

    if (item.type === 'infoBlock') {
      const lines = context.infoLines ?? []
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const lineH = h / Math.max(lines.length, 1)
      lines.forEach((line, i) => {
        ctx.font = i === 0 ? `700 ${Math.round(34 * fontSize)}px ${fontOf(item)}` : `500 ${Math.round(24 * fontSize)}px ${fontOf(item)}`
        ctx.fillStyle = i === 0 ? resolveColor(color, tc) : sc
        ctx.fillText(line, x + w / 2, y + lineH * (i + 0.7))
      })
    }

    if (item.type === 'photo') {
      const slot = context.photos?.[photoIndex] ?? (photoIndex === 0 ? context.photo : undefined)
      photoIndex++

      const shape = item.photoShape ?? 'circle'
      const size = Math.min(w, h)
      const fw = shape === 'full' ? w : size
      const fh = shape === 'full' ? h : size
      const fx = x + (w - fw) / 2
      const fy = y
      const radius = shape === 'circle' ? Math.min(fw, fh) / 2 : shape === 'rounded' ? Math.min(fw, fh) * 0.16 : 0

      roundRect(ctx, fx, fy, fw, fh, radius)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fill()
      const img = slot?.img
      if (img) {
        ctx.save()
        roundRect(ctx, fx, fy, fw, fh, radius)
        ctx.clip()
        const ratio = Math.max(fw / img.width, fh / img.height)
        const iw = img.width * ratio
        const ih = img.height * ratio
        ctx.drawImage(img, fx + (fw - iw) / 2, fy + (fh - ih) / 2, iw, ih)
        ctx.restore()
      } else {
        ctx.fillStyle = resolveColor(color, sc)
        ctx.font = `900 ${Math.round(Math.min(fw, fh) * 0.38)}px ${fontOf(item)}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(slot?.fallbackText || '?', fx + fw / 2, fy + fh / 2 + 6)
      }
    }

    if (item.type === 'optionsList') {
      const options = context.options ?? []
      const gap = 22
      const rowH = Math.max(60, Math.min(90, (h - (options.length - 1) * gap) / Math.max(options.length, 1)))
      const labelColor = resolveColor(color, tc)
      options.slice(0, 4).forEach((opt, i) => {
        const ry = y + i * (rowH + gap)
        roundRect(ctx, x, ry, w, rowH, rowH / 2)
        ctx.fillStyle = 'rgba(255,255,255,0.10)'
        ctx.fill()
        const letterSize = Math.min(56, rowH - 34)
        roundRect(ctx, x + 14, ry + (rowH - letterSize) / 2, letterSize, letterSize, letterSize / 2)
        ctx.fillStyle = sc
        ctx.fill()
        ctx.fillStyle = textColor(sc)
        ctx.font = `800 ${Math.round(letterSize * 0.46)}px ${fontOf(item)}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String.fromCharCode(65 + i), x + 14 + letterSize / 2, ry + rowH / 2 + 1)
        ctx.textAlign = 'left'
        ctx.fillStyle = labelColor
        ctx.font = `700 ${Math.round(28 * fontSize)}px ${fontOf(item)}`
        ctx.fillText(truncate(opt, 26), x + 14 + letterSize + 24, ry + rowH / 2 + 9)
      })
    }

    if (item.type === 'footer') {
      const fill = resolveColor(color, sc)
      ctx.fillStyle = fill
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = textColor(fill)
      ctx.font = `800 ${Math.round(26 * fontSize)}px ${fontOf(item)}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.footerVariant === 'clubName' ? context.clubName : '⚡ tribunes.app', x + 60, y + h / 2)
      if (item.footerVariant !== 'clubName') {
        ctx.font = `400 20px ${fontOf(item)}`
        ctx.textAlign = 'right'
        ctx.fillText(
          `#${context.clubName.toLowerCase().replace(/\s/g, '')} #${context.sport.toLowerCase()}`,
          x + w - 60, y + h / 2
        )
      }
    }

    if (item.type === 'text') {
      ctx.fillStyle = resolveColor(color, tc)
      ctx.font = `${Math.round(36 * fontSize)}px ${fontOf(item)}`
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillText(item.text || 'Texte personnalisé', x, y)
    }
    if (item.type === 'rect') {
      roundRect(ctx, x, y, w, h, item.borderRadius ?? 0)
      ctx.fillStyle = resolveColor(color, sc)
      ctx.fill()
      if (item.strokeColor && item.strokeWidth) { ctx.strokeStyle = item.strokeColor; ctx.lineWidth = item.strokeWidth; ctx.stroke() }
    }
    if (item.type === 'circle') {
      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      ctx.fillStyle = resolveColor(color, sc)
      ctx.fill()
      if (item.strokeColor && item.strokeWidth) { ctx.strokeStyle = item.strokeColor; ctx.lineWidth = item.strokeWidth; ctx.stroke() }
    }
    if (item.type === 'line') {
      ctx.beginPath()
      ctx.moveTo(x, y + h / 2)
      ctx.lineTo(x + w, y + h / 2)
      ctx.strokeStyle = resolveColor(color, tc)
      ctx.lineWidth = item.strokeWidth ?? 4
      ctx.stroke()
    }

    ctx.restore()
  }
}
