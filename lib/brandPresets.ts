/** Palettes prédéfinies proposées dans Identité du club > Logo et couleurs. */
export const BRAND_COLOR_PRESETS = [
  { label: 'Bleu nuit / Rouge', primary: '#111827', secondary: '#2563eb' },
  { label: 'Marine / Or', primary: '#0a1628', secondary: '#f5a623' },
  { label: 'Vert foret / Blanc', primary: '#1a3d2b', secondary: '#ffffff' },
  { label: 'Bordeaux / Beige', primary: '#6b1a2a', secondary: '#f5e6d3' },
  { label: 'Noir / Cyan', primary: '#0d0d0d', secondary: '#00d4ff' },
  { label: 'Violet / Lime', primary: '#2d1b69', secondary: '#a8ff3e' },
] as const

export function matchingPresetLabel(primary: string, secondary: string): string | null {
  const match = BRAND_COLOR_PRESETS.find(p => p.primary === primary && p.secondary === secondary)
  return match?.label ?? null
}
