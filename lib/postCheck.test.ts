import { describe, expect, it } from 'vitest'
import { checkPostBeforePublish } from './postCheck'

describe('checkPostBeforePublish', () => {
  it('signale un crochet non rempli', () => {
    expect(checkPostBeforePublish('Victoire de [équipe] !')).toEqual(['Il reste un passage à compléter : [équipe]'])
  })

  it('liste plusieurs crochets sans doublon', () => {
    expect(checkPostBeforePublish('[équipe] merci à [nom du sponsor] et [équipe]')).toEqual([
      'Il reste 2 passages à compléter : [équipe], [nom du sponsor]',
    ])
  })

  it('ne renvoie rien pour un texte complet', () => {
    expect(checkPostBeforePublish('Belle victoire 6-2 ce samedi !')).toEqual([])
  })

  it('ignore les crochets vides ou non fermés', () => {
    expect(checkPostBeforePublish('Test [] et [ouvert')).toEqual([])
  })
})
