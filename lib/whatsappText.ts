const HASHTAG = /(^|\s)#[\p{L}\p{N}_]+/gu

// Version WhatsApp d'un post : sans hashtags, sans lignes vides en double.
// On nettoie seulement, on ne résume pas.
export function toWhatsAppText(text: string): string {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => {
      const cleaned = line.replace(HASHTAG, '$1').replace(/[ \t]+/g, ' ').trim()
      return { cleaned, hadHashtag: cleaned !== line.replace(/[ \t]+/g, ' ').trim() }
    })
    // une ligne devenue vide à cause des hashtags disparaît entièrement
    .filter(l => l.cleaned !== '' || !l.hadHashtag)
    .map(l => l.cleaned)

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
