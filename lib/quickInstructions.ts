export const MAX_CUSTOM_INSTRUCTIONS = 300

export const QUICK_INSTRUCTIONS = [
  { label: 'Plus court', text: 'Plus court.' },
  { label: 'Plus chaleureux', text: 'Plus chaleureux.' },
  { label: 'Sans émojis', text: 'Sans émojis.' },
  { label: 'Invite les membres à venir nombreux', text: 'Invite les membres à venir nombreux.' },
] as const

export function hasInstruction(current: string, text: string): boolean {
  return current.includes(text)
}

/** Ajoute la consigne si absente (sans écraser, sans dépasser la limite), la retire sinon. */
export function toggleInstruction(current: string, text: string): string {
  if (hasInstruction(current, text)) {
    return current.replace(text, '').replace(/\s{2,}/g, ' ').trim()
  }
  const next = current.trim() ? `${current.trim()} ${text}` : text
  return next.length > MAX_CUSTOM_INSTRUCTIONS ? current : next
}

/** Vrai si la consigne ne peut plus être ajoutée sans dépasser la limite. */
export function isInstructionBlocked(current: string, text: string): boolean {
  return !hasInstruction(current, text) && toggleInstruction(current, text) === current
}
