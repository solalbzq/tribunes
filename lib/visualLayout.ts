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
