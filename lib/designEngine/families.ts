import type { DesignFamilyId, FamilyTokens } from './types'

/**
 * Familles de direction artistique — des jeux de paramètres, jamais du code séparé.
 * Les composers (background.ts, grid.ts, typography.ts...) lisent ces tokens et
 * produisent un résultat différent sans qu'aucune branche de rendu ne soit dupliquée
 * par famille. Ajouter une famille = ajouter une entrée ici. Cf. plan §5.5.
 */
export const FAMILIES: Record<DesignFamilyId, FamilyTokens> = {
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    margin: 108, // 10% de 1080 — beaucoup de respiration
    heroScale: 1,
    labelLetterSpacing: 3,
    labelUppercase: true,
    backgroundVariants: ['solid', 'gradient-halo'],
    gridVariants: ['centered', 'bottom-weighted'],
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    margin: 72,
    heroScale: 0.88,
    labelLetterSpacing: 2,
    labelUppercase: true,
    backgroundVariants: ['accent-block', 'solid'],
    gridVariants: ['accent-split', 'top-weighted'],
  },
}
