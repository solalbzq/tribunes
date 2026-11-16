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

describe('checkPostBeforePublish — annonces', () => {
  const annonce = { postType: 'CLUB_ANNOUNCEMENT' as const }

  it("signale l'heure manquante", () => {
    expect(checkPostBeforePublish('Assemblée générale samedi prochain à la salle des fêtes', annonce)).toEqual([
      "Pensez à indiquer l'heure du rendez-vous",
    ])
  })

  it('signale la date manquante', () => {
    expect(checkPostBeforePublish('Rendez-vous à 18h au gymnase', annonce)).toEqual([
      'Pensez à indiquer la date du rendez-vous',
    ])
  })

  it('accepte « samedi prochain » et « 18 h 30 »', () => {
    expect(checkPostBeforePublish('Loto samedi prochain à 18 h 30', annonce)).toEqual([])
  })

  it.each(['18h', '18h30', '18:30', '9 h', 'midi'])("reconnaît l'heure « %s »", h => {
    expect(checkPostBeforePublish(`Le 12 mars à ${h}`, annonce)).toEqual([])
  })

  it.each(['le 12/03', '12.03.2027', '1er avril', 'demain', 'dimanche'])("reconnaît la date « %s »", d => {
    expect(checkPostBeforePublish(`${d} à 10h`, annonce)).toEqual([])
  })

  it('ne prend pas « 5 hommes » pour une heure', () => {
    expect(checkPostBeforePublish('Samedi, 5 hommes au stade', annonce)).toEqual([
      "Pensez à indiquer l'heure du rendez-vous",
    ])
  })

  it('signale un lieu vide pour un avant-match', () => {
    expect(checkPostBeforePublish('Samedi 14 à 18h contre Lyon', { postType: 'MATCH_ANNOUNCEMENT', venue: ' ' })).toEqual([
      'Pensez à indiquer le lieu du rendez-vous',
    ])
  })

  it('ne dit rien si le lieu est renseigné ou inconnu du formulaire', () => {
    expect(checkPostBeforePublish('Samedi 14 à 18h', { postType: 'MATCH_ANNOUNCEMENT', venue: 'Stade' })).toEqual([])
    expect(checkPostBeforePublish('Samedi 14 à 18h', annonce)).toEqual([])
  })

  it('ne contrôle pas les autres types de post', () => {
    expect(checkPostBeforePublish('Belle victoire !', { postType: 'MATCH_RESULT' })).toEqual([])
  })
})
