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
