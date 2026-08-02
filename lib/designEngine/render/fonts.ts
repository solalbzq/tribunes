import { readFileSync } from 'fs'
import { join } from 'path'

export type SatoriFont = {
  name: string
  data: Buffer
  weight: 400 | 700 | 900
  style: 'normal'
}

let cached: SatoriFont[] | null = null

/**
 * Charge les fichiers de police embarqués (WOFF — Satori ne supporte pas WOFF2) une
 * seule fois par instance de fonction serverless. Rendu déterministe : aucun appel
 * réseau à la génération, contrairement à un `<link>` Google Fonts navigateur.
 */
export function loadFonts(): SatoriFont[] {
  if (cached) return cached
  const dir = join(process.cwd(), 'lib/designEngine/render/fonts')
  cached = [
    { name: 'Inter', data: readFileSync(join(dir, 'Inter-Regular.woff')), weight: 400, style: 'normal' },
    { name: 'Inter', data: readFileSync(join(dir, 'Inter-Bold.woff')), weight: 700, style: 'normal' },
    { name: 'Inter', data: readFileSync(join(dir, 'Inter-Black.woff')), weight: 900, style: 'normal' },
  ]
  return cached
}
