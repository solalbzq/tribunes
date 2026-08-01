import { describe, it, expect } from 'vitest'
import { questionnaireToInstructions } from './onboardingQuestionnaire'

describe('questionnaireToInstructions', () => {
  it('returns no sentence when nothing is answered', () => {
    expect(questionnaireToInstructions({ tone: null, focus: null, emojiLevel: null })).toEqual([])
  })

  it('maps a focus answer to an explicit, human-readable sentence', () => {
    const lines = questionnaireToInstructions({ tone: null, focus: 'community', emojiLevel: null })
    expect(lines).toEqual(['Valorise régulièrement les bénévoles et la vie du club.'])
  })

  it('maps an emoji level answer to an explicit sentence', () => {
    expect(questionnaireToInstructions({ tone: null, focus: null, emojiLevel: 'high' }))
      .toEqual(["N'hésite pas à utiliser des emojis pour dynamiser le texte."])
  })

  it('combines focus and emoji answers, in order', () => {
    const lines = questionnaireToInstructions({ tone: 'FUN', focus: 'results', emojiLevel: 'low' })
    expect(lines).toEqual([
      'Mets en avant les résultats sportifs et les performances de l’équipe.',
      "Utilise peu d'emojis, une écriture sobre.",
    ])
  })

  it('produces no sentence for neutral answers ("all" focus, "medium" emoji level)', () => {
    expect(questionnaireToInstructions({ tone: 'STANDARD', focus: 'all', emojiLevel: 'medium' })).toEqual([])
  })
})
