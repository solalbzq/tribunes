/**
 * Échappe une valeur pour un export CSV ouvert dans un tableur. Neutralise
 * l'injection de formule (=, +, -, @ en tête de cellule peuvent déclencher
 * l'exécution d'une formule dans Excel/Google Sheets) en plus des guillemets.
 */
export function escapeCsvValue(value: string) {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  const normalized = guarded.replace(/"/g, '""')
  return `"${normalized}"`
}
