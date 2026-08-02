// Petits utilitaires couleur autonomes — le Design Engine ne dépend d'aucun module du
// moteur actuel (y compris lib/colorDetection.ts), pour rester totalement isolable.

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Assombrit une couleur d'un ratio 0–1 (0 = inchangé, 1 = noir). */
export function darken(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio))
}

/** Éclaircit une couleur d'un ratio 0–1 (0 = inchangé, 1 = blanc). */
export function lighten(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio)
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Choisit blanc ou encre foncée selon la luminosité du fond, pour un texte toujours lisible. */
export function readableTextColor(backgroundHex: string): string {
  return relativeLuminance(backgroundHex) > 0.45 ? '#111111' : '#fbfbfa'
}

/** Mélange deux couleurs (0 = full a, 1 = full b) — utilisé pour teinter un fond neutre avec la couleur de marque. */
export function mix(hexA: string, hexB: string, ratio: number): string {
  const [ar, ag, ab] = hexToRgb(hexA)
  const [br, bg, bb] = hexToRgb(hexB)
  return rgbToHex(ar + (br - ar) * ratio, ag + (bg - ag) * ratio, ab + (bb - ab) * ratio)
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255]
}

/**
 * Force une couleur vers un rendu "vif" (saturation et luminosité poussées dans une
 * plage punchy) en conservant sa teinte — utilisé par la famille Bold pour garantir un
 * fond plein-cadre éclatant même quand la couleur de marque du club est très sombre ou
 * très pâle.
 */
export function vivid(hex: string, minSaturation = 0.55, lightness = 0.42): string {
  const [r, g, b] = hexToRgb(hex)
  const [h, s] = rgbToHsl(r, g, b)
  const [vr, vg, vb] = hslToRgb(h, Math.max(s, minSaturation), lightness)
  return rgbToHex(vr, vg, vb)
}
