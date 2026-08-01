/**
 * Détection déterministe de la palette dominante d'une image (logo), côté
 * navigateur, sans appel IA — cf. Lot 3 du Brand Kit : la détection de
 * couleurs doit être déterministe. Échantillonne les pixels via un canvas ;
 * échoue proprement (retourne `null`) si l'image est cross-origin sans
 * CORS ouvert (canvas "taintée", lecture des pixels bloquée par le
 * navigateur) — l'appelant doit alors proposer une saisie manuelle.
 */
export type DetectedPalette = { primary: string; secondary: string }

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

export async function detectDominantColors(imageSrc: string): Promise<DetectedPalette | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const size = 48
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0, size, size)

      let data: Uint8ClampedArray
      try {
        data = ctx.getImageData(0, 0, size, size).data
      } catch {
        resolve(null) // image cross-origin sans CORS — canvas taintée
        return
      }

      // Regroupe les pixels par teinte proche (pas de blanc/noir quasi-pur,
      // souvent le fond du logo plutôt qu'une vraie couleur de marque).
      const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
        if (a < 200) continue
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        const isNearWhite = min > 235
        const isNearBlack = max < 20
        if (isNearWhite || isNearBlack) continue
        const key = `${Math.round(r / 24)},${Math.round(g / 24)},${Math.round(b / 24)}`
        const existing = buckets.get(key)
        if (existing) { existing.count++; existing.r += r; existing.g += g; existing.b += b }
        else buckets.set(key, { count: 1, r, g, b })
      }

      const sorted = [...buckets.values()].sort((a, b) => b.count - a.count)
      if (sorted.length === 0) { resolve(null); return }

      const primary = sorted[0]
      const secondary = sorted[1] ?? sorted[0]
      resolve({
        primary: toHex(Math.round(primary.r / primary.count), Math.round(primary.g / primary.count), Math.round(primary.b / primary.count)),
        secondary: toHex(Math.round(secondary.r / secondary.count), Math.round(secondary.g / secondary.count), Math.round(secondary.b / secondary.count)),
      })
    }
    img.onerror = () => resolve(null)
    img.src = imageSrc
  })
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Ratio de contraste WCAG entre deux couleurs (1 = aucun contraste, 21 = maximal). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}
