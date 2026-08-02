/**
 * Presets de style de l'onboarding rapide — n'affectent que le ton et les
 * consignes envoyées à l'IA (contentTone, instructions). Volontairement
 * indépendants des couleurs : celles-ci viennent du logo détecté ou d'une
 * palette choisie explicitement (cf. BRAND_COLOR_PRESETS dans
 * lib/brandPresets.ts), jamais du style éditorial choisi ici.
 */
export type OnboardingPreset = {
  key: string
  label: string
  description: string
  contentTone: 'STANDARD' | 'FUN' | 'SOBER'
  instructions: string
}

export const ONBOARDING_PRESETS: OnboardingPreset[] = [
  {
    key: 'familial',
    label: 'Club familial',
    description: 'Chaleureux, proche des familles et des jeunes',
    contentTone: 'FUN',
    instructions: 'Mets en avant la convivialité, les familles et les jeunes du club.',
  },
  {
    key: 'competiteur',
    label: 'Club compétiteur',
    description: 'Factuel, centré sur la performance sportive',
    contentTone: 'SOBER',
    instructions: 'Insiste sur la performance sportive et les résultats, reste factuel.',
  },
  {
    key: 'institutionnel',
    label: 'Club institutionnel',
    description: 'Officiel, respectueux, tourné vers les partenaires',
    contentTone: 'SOBER',
    instructions: 'Adopte un ton officiel et respectueux, mentionne les partenaires institutionnels.',
  },
  {
    key: 'communautaire',
    label: 'Club communautaire',
    description: 'Valorise les bénévoles et la vie associative',
    contentTone: 'FUN',
    instructions: "Valorise les bénévoles, l'entraide et la vie associative du club.",
  },
  {
    key: 'moderne',
    label: 'Club moderne',
    description: 'Dynamique et direct, ton contemporain',
    contentTone: 'STANDARD',
    instructions: 'Reste dynamique et direct, avec un ton contemporain.',
  },
]
