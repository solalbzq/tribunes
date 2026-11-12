import { describe, it, expect } from 'vitest'
import { toWhatsAppText } from './whatsappText'

describe('toWhatsAppText', () => {
  it('retire les hashtags en fin de texte', () => {
    expect(toWhatsAppText('Belle victoire ! 🎾\n\n#tennis #club #Victoire')).toBe('Belle victoire ! 🎾')
  })

  it('retire les hashtags au milieu en gardant le texte et les emojis', () => {
    expect(toWhatsAppText('Bravo #tennis à toute l’équipe 🏆 !')).toBe('Bravo à toute l’équipe 🏆 !')
  })

  it('garde un texte sans hashtag', () => {
    expect(toWhatsAppText('Match samedi à 15h\nRendez-vous au club')).toBe('Match samedi à 15h\nRendez-vous au club')
  })

  it('supprime les lignes vides en double', () => {
    expect(toWhatsAppText('A\n\n\n\nB\n\n#a #b\n\n\nC')).toBe('A\n\nB\n\nC')
  })

  it('ne touche pas aux # non hashtags collés à un mot', () => {
    expect(toWhatsAppText('Court n°3 / a#b')).toBe('Court n°3 / a#b')
  })

  it('gère les hashtags accentués', () => {
    expect(toWhatsAppText('Merci ! #équipe #été')).toBe('Merci !')
  })
})
