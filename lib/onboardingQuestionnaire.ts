/**
 * Questionnaire stratégique de l'onboarding rapide — transforme des réponses
 * fermées en phrases de consigne explicites et modifiables (jamais une
 * valeur numérique brute injectée dans un prompt).
 */
export type QuestionnaireFocus = 'results' | 'community' | 'supporters' | 'all'
export type QuestionnaireEmojiLevel = 'low' | 'medium' | 'high'

export type QuestionnaireAnswers = {
  tone: 'STANDARD' | 'FUN' | 'SOBER' | null
  focus: QuestionnaireFocus | null
  emojiLevel: QuestionnaireEmojiLevel | null
}

const FOCUS_SENTENCES: Record<QuestionnaireFocus, string> = {
  results: 'Mets en avant les résultats sportifs et les performances de l’équipe.',
  community: 'Valorise régulièrement les bénévoles et la vie du club.',
  supporters: 'Adresse-toi directement aux supporters, remercie-les régulièrement.',
  all: '',
}

const EMOJI_SENTENCES: Record<QuestionnaireEmojiLevel, string> = {
  low: "Utilise peu d'emojis, une écriture sobre.",
  medium: '',
  high: "N'hésite pas à utiliser des emojis pour dynamiser le texte.",
}

/** Phrases de consigne dérivées des réponses — à afficher et éditer avant application, jamais appliquées silencieusement. */
export function questionnaireToInstructions(answers: QuestionnaireAnswers): string[] {
  const lines: string[] = []
  if (answers.focus && FOCUS_SENTENCES[answers.focus]) lines.push(FOCUS_SENTENCES[answers.focus])
  if (answers.emojiLevel && EMOJI_SENTENCES[answers.emojiLevel]) lines.push(EMOJI_SENTENCES[answers.emojiLevel])
  return lines
}
