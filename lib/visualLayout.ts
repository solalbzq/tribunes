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
  // Colors & opacity
  color: string         // fill / text color
  secondaryColor?: string
  opacity: number       // 0–1 for the element itself
  // Shapes
  borderRadius?: number
  strokeColor?: string
  strokeWidth?: number
  // Logo-specific
  logoShowBg?: boolean  // false = no background bubble
}

export type VisualConfig = {
  bgOpacity: number     // opacity of background photo (0–1)
  elements: LayoutElement[]
}

export const SIZE = 1080

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

export const DEFAULT_CONFIG: VisualConfig = {
  bgOpacity: 0.75,
  elements: DEFAULT_ELEMENTS,
}

export function parseVisualConfig(raw: unknown): VisualConfig {
  if (!raw) return DEFAULT_CONFIG
  // Old format: array of elements
  if (Array.isArray(raw)) {
    return { bgOpacity: 0.75, elements: mergeElementsWithDefaults(raw as LayoutElement[]) }
  }
  // New format: VisualConfig object
  const cfg = raw as Partial<VisualConfig>
  return {
    bgOpacity: cfg.bgOpacity ?? 0.75,
    elements: mergeElementsWithDefaults(cfg.elements ?? []),
  }
}

function mergeElementsWithDefaults(saved: LayoutElement[]): LayoutElement[] {
  const savedMap = new Map(saved.map(e => [e.id, e]))
  // Start from defaults, overlay saved values for known elements
  const merged = DEFAULT_ELEMENTS.map(def => {
    const s = savedMap.get(def.id)
    return s ? { ...def, ...s } : def
  })
  // Append custom elements (not in defaults)
  const defaultIds = new Set(DEFAULT_ELEMENTS.map(e => e.id))
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

    if (el.type === 'sport') {
      ctx.fillStyle = color
      ctx.font = `600 ${Math.round(28 * fontSize)}px Inter, sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(match.sport.toUpperCase(), x, y)
    }

    if (el.type === 'clubName') {
      ctx.fillStyle = color
      ctx.font = `800 ${Math.round(56 * fontSize)}px Inter, sans-serif`
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
      ctx.font = `800 ${Math.round(28 * fontSize)}px Inter, sans-serif`
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
        ctx.font = `600 ${Math.round(18 * fontSize)}px Inter, sans-serif`
        ctx.fillStyle = color + '88'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(match.scoreLabel, midX, y + h * 0.48)
      }

      // Scores
      const scoreY = hasDetails ? y + h * 0.58 : y + h * 0.64
      ctx.font = `900 ${Math.round(130 * fontSize)}px Inter, sans-serif`
      ctx.fillStyle = color
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${match.clubScore}`, midX - 140, scoreY)
      ctx.fillText('-', midX, scoreY - 6)
      ctx.fillText(`${match.oppScore}`, midX + 140, scoreY)

      // Labels équipes
      const labelY = hasDetails ? y + h * 0.70 : y + h * 0.80
      ctx.font = `600 ${Math.round(22 * fontSize)}px Inter, sans-serif`
      ctx.fillStyle = match.secondaryColor
      ctx.fillText(match.clubName, midX - 140, labelY)
      ctx.fillText(match.opponent, midX + 140, labelY)

      // Detail lines (quarters / sets / buteurs / mi-temps)
      if (hasDetails) {
        const lines = match.detailLines!
        const lineH = Math.round(26 * fontSize)
        const totalH = lines.length * lineH
        const startY = y + h * 0.74
        ctx.font = `500 ${Math.round(20 * fontSize)}px Inter, sans-serif`
        ctx.fillStyle = color + 'bb'
        lines.forEach((line, i) => {
          ctx.fillText(line, midX, startY + i * lineH)
        })
      }

      // Compétition
      ctx.font = `400 ${Math.round(20 * fontSize)}px Inter, sans-serif`
      ctx.fillStyle = color + '88'
      ctx.fillText(match.competition || 'Match amical', midX, y + h - 22)
      ctx.textAlign = 'left'
    }

    if (el.type === 'footer') {
      ctx.fillStyle = color
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = textColor(color)
      ctx.font = `800 ${Math.round(26 * fontSize)}px Inter, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚡ tribunes.app', x + 60, y + h / 2)
      ctx.font = `400 ${Math.round(20 * fontSize)}px Inter, sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(
        `#${match.clubName.toLowerCase().replace(/\s/g, '')} #${match.sport.toLowerCase()}`,
        x + w - 60, y + h / 2
      )
      ctx.textAlign = 'left'
    }

    // ── Custom elements
    if (el.type === 'text') {
      ctx.fillStyle = color
      ctx.font = `${Math.round(36 * fontSize)}px Inter, sans-serif`
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
const PW = POST_VISUAL_SIZE.W
const PH = POST_VISUAL_SIZE.H

export type PostVisualKind =
  | 'tournament' | 'schedule' | 'seasonRecap'
  | 'matchAnnouncement' | 'playerSpotlight' | 'clubAnnouncement' | 'engagementPoll'

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
  /** Chaîne vide = hérite dynamiquement de la couleur de marque du club (comportement par défaut). Une valeur = surcharge manuelle. */
  color: string
  opacity: number
  borderRadius?: number
  strokeColor?: string
  strokeWidth?: number
  logoShowBg?: boolean
}

export type PostVisualConfig = { elements: PostVisualElement[] }

/** Éléments "cœur" (verrouillés, non supprimables) par type de post, dans l'ordre de dessin. */
export const POST_VISUAL_CORE_ELEMENTS: Record<PostVisualKind, PostVisualElementType[]> = {
  tournament: ['logo', 'heading', 'subheading', 'badge', 'matchList', 'footer'],
  schedule: ['logo', 'heading', 'subheading', 'badge', 'matchList', 'footer'],
  seasonRecap: ['logo', 'heading', 'subheading', 'badge', 'statsBlock', 'footer'],
  matchAnnouncement: ['badge', 'logo', 'vsBlock', 'infoBlock', 'footer'],
  playerSpotlight: ['badge', 'photo', 'heading', 'paragraph', 'footer'],
  clubAnnouncement: ['badge', 'logo', 'heading', 'paragraph', 'footer'],
  engagementPoll: ['badge', 'logo', 'heading', 'optionsList', 'footer'],
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
}

export function defaultPostVisualElements(kind: PostVisualKind): PostVisualElement[] {
  return POST_VISUAL_DEFAULTS[kind]
}

/** Équivalent de parseVisualConfig() pour le système générique — fusionne la config sauvegardée d'un type de post avec ses éléments par défaut. */
export function parsePostVisualConfig(raw: unknown, kind: PostVisualKind): PostVisualConfig {
  const defaults = defaultPostVisualElements(kind)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { elements: defaults }
  const saved = (raw as Record<string, { elements?: PostVisualElement[] }>)[kind]?.elements
  if (!saved || !Array.isArray(saved)) return { elements: defaults }
  const savedMap = new Map(saved.map(e => [e.id, e]))
  const merged = defaults.map(def => {
    const s = savedMap.get(def.id)
    return s ? { ...def, ...s } : def
  })
  const defaultIds = new Set(defaults.map(e => e.id))
  saved.filter(e => !defaultIds.has(e.id)).forEach(e => merged.push(e))
  return { elements: merged }
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
  options?: string[]
}

/** Dessine les éléments d'un visuel générique (tournoi/programme/bilan/avant-match/joueur/annonce/sondage). */
export function drawPostVisualElements(
  ctx: CanvasRenderingContext2D,
  elements: PostVisualElement[],
  context: PostVisualContext
) {
  const sc = context.secondaryColor
  const tc = context.textColor

  for (const item of elements) {
    if (!item.visible) continue
    const { x, y, w, h, fontSize, opacity, color } = item
    ctx.save()
    ctx.globalAlpha = opacity

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
      ctx.font = `900 ${Math.round(52 * fontSize)}px Inter, sans-serif`
      ctx.fillText(truncate(text, 30), x + w / 2, y + h)
    }

    if (item.type === 'subheading') {
      ctx.fillStyle = resolveColor(color, sc)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const text = item.text || context.subheading || ''
      ctx.font = `600 ${Math.round(24 * fontSize)}px Inter, sans-serif`
      ctx.fillText(text.toUpperCase(), x + w / 2, y + h)
    }

    if (item.type === 'paragraph') {
      ctx.fillStyle = resolveColor(color, sc)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const text = item.text || context.paragraph || ''
      const size = Math.round(28 * fontSize)
      ctx.font = `600 ${size}px Inter, sans-serif`
      const lineH = size * 1.4
      const maxLines = Math.max(1, Math.floor(h / lineH))
      const lines = wrapText(ctx, text, w - 40, maxLines)
      const startY = y + lineH
      lines.forEach((line, i) => ctx.fillText(line, x + w / 2, startY + i * lineH))
    }

    if (item.type === 'badge') {
      const text = item.text || context.badge || ''
      const fill = resolveColor(color, sc)
      ctx.font = `800 ${Math.round(26 * fontSize)}px Inter, sans-serif`
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
        ctx.font = `900 ${Math.round(28 * fontSize)}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(row.leftBadge || '—', x + 20 + lbW / 2, ry + rowH / 2)

        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = textColorResolved
        ctx.font = `700 ${Math.round(28 * fontSize)}px Inter, sans-serif`
        ctx.fillText(truncate(row.title, 22), x + 20 + lbW + 22, ry + rowH * 0.52)
        ctx.font = `400 ${Math.round(19 * fontSize)}px Inter, sans-serif`
        ctx.fillStyle = textColorResolved + 'aa'
        ctx.fillText(row.subtitle, x + 20 + lbW + 22, ry + rowH * 0.8)

        if (row.rightBadge) {
          ctx.font = '600 16px Inter, sans-serif'
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
        ctx.font = `900 ${Math.round(100 * fontSize)}px Inter, sans-serif`
        ctx.fillStyle = s.color
        ctx.fillText(String(s.value), midX, y + h * 0.52)
        ctx.font = `700 ${Math.round(22 * fontSize)}px Inter, sans-serif`
        ctx.fillStyle = labelColor
        ctx.fillText(s.label, midX, y + h * 0.66)
      })
      ctx.textAlign = 'center'
      if (context.statsCaption) {
        ctx.font = '500 22px Inter, sans-serif'
        ctx.fillStyle = labelColor + 'aa'
        ctx.fillText(context.statsCaption, x + w / 2, y + h + 50)
      }
      if (context.statsNote) {
        ctx.font = '700 26px Inter, sans-serif'
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
      ctx.font = `800 ${Math.round(50 * fontSize)}px Inter, sans-serif`
      ctx.fillText(truncate(context.vs.left, 20), midX, y + h * 0.2)

      roundRect(ctx, midX - 46, y + h * 0.32, 92, 56, 28)
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.fill()
      ctx.fillStyle = vsColor
      ctx.font = '900 28px Inter, sans-serif'
      ctx.fillText('VS', midX, y + h * 0.32 + 36)

      ctx.fillStyle = sc
      ctx.font = `800 ${Math.round(50 * fontSize)}px Inter, sans-serif`
      ctx.fillText(truncate(context.vs.right, 20), midX, y + h * 0.68)

      if (context.vs.badge) {
        ctx.font = '600 20px Inter, sans-serif'
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
        ctx.font = i === 0 ? `700 ${Math.round(34 * fontSize)}px Inter, sans-serif` : `500 ${Math.round(24 * fontSize)}px Inter, sans-serif`
        ctx.fillStyle = i === 0 ? resolveColor(color, tc) : sc
        ctx.fillText(line, x + w / 2, y + lineH * (i + 0.7))
      })
    }

    if (item.type === 'photo') {
      const size = Math.min(w, h)
      const px = x + (w - size) / 2
      const py = y
      roundRect(ctx, px, py, size, size, size / 2)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fill()
      const img = context.photo?.img
      if (img) {
        ctx.save()
        roundRect(ctx, px, py, size, size, size / 2)
        ctx.clip()
        const ratio = Math.max(size / img.width, size / img.height)
        const iw = img.width * ratio
        const ih = img.height * ratio
        ctx.drawImage(img, px + (size - iw) / 2, py + (size - ih) / 2, iw, ih)
        ctx.restore()
      } else {
        ctx.fillStyle = resolveColor(color, sc)
        ctx.font = `900 ${Math.round(size * 0.38)}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(context.photo?.fallbackText || '?', px + size / 2, py + size / 2 + 6)
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
        ctx.font = `800 ${Math.round(letterSize * 0.46)}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String.fromCharCode(65 + i), x + 14 + letterSize / 2, ry + rowH / 2 + 1)
        ctx.textAlign = 'left'
        ctx.fillStyle = labelColor
        ctx.font = `700 ${Math.round(28 * fontSize)}px Inter, sans-serif`
        ctx.fillText(truncate(opt, 26), x + 14 + letterSize + 24, ry + rowH / 2 + 9)
      })
    }

    if (item.type === 'footer') {
      const fill = resolveColor(color, sc)
      ctx.fillStyle = fill
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = textColor(fill)
      ctx.font = `800 ${Math.round(26 * fontSize)}px Inter, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚡ tribunes.app', x + 60, y + h / 2)
      ctx.font = '400 20px Inter, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(
        `#${context.clubName.toLowerCase().replace(/\s/g, '')} #${context.sport.toLowerCase()}`,
        x + w - 60, y + h / 2
      )
    }

    if (item.type === 'text') {
      ctx.fillStyle = resolveColor(color, tc)
      ctx.font = `${Math.round(36 * fontSize)}px Inter, sans-serif`
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
