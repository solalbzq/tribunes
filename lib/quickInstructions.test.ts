import { describe, it, expect } from 'vitest'
import { QUICK_INSTRUCTIONS, MAX_CUSTOM_INSTRUCTIONS, toggleInstruction, hasInstruction, isInstructionBlocked } from './quickInstructions'

const [court, chaleureux] = QUICK_INSTRUCTIONS.map(i => i.text)

describe('quickInstructions', () => {
  it('ajoute une consigne à un champ vide', () => {
    expect(toggleInstruction('', court)).toBe(court)
  })
  it("ajoute sans écraser le texte existant", () => {
    const r = toggleInstruction('Cite le sponsor.', court)
    expect(r).toBe(`Cite le sponsor. ${court}`)
  })
  it('retire la consigne au second clic', () => {
    const added = toggleInstruction('Cite le sponsor.', court)
    expect(hasInstruction(added, court)).toBe(true)
    expect(toggleInstruction(added, court)).toBe('Cite le sponsor.')
  })
  it('retire une consigne au milieu en gardant les autres', () => {
    const both = toggleInstruction(toggleInstruction('', court), chaleureux)
    expect(toggleInstruction(both, court)).toBe(chaleureux)
  })
  it('ne dépasse jamais la limite', () => {
    const full = 'a'.repeat(MAX_CUSTOM_INSTRUCTIONS - 5)
    expect(toggleInstruction(full, court)).toBe(full)
    expect(isInstructionBlocked(full, court)).toBe(true)
  })
  it('accepte une consigne qui tient pile dans la limite', () => {
    const base = 'a'.repeat(MAX_CUSTOM_INSTRUCTIONS - court.length - 1)
    expect(toggleInstruction(base, court).length).toBe(MAX_CUSTOM_INSTRUCTIONS)
  })
})
