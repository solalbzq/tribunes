// Dump du HTML rendu d'une page Ten'Up via ScrapingBee, pour mettre au point
// le parser des rencontres. Usage :
//   SCRAPINGBEE_API_KEY=xxx node scripts/tenup-debug.mjs "https://tenup.fft.fr/club/60300491/competitions"
// Écrit le HTML dans scripts/.tenup-dump.html

import { writeFileSync } from 'node:fs'

const key = process.env.SCRAPINGBEE_API_KEY
const url = process.argv[2] || 'https://tenup.fft.fr/club/60300491/competitions'
if (!key) {
  console.error('SCRAPINGBEE_API_KEY manquant.')
  process.exit(1)
}

const params = new URLSearchParams({
  api_key: key,
  url,
  render_js: 'true',
  premium_proxy: 'true',
  country_code: 'fr',
  wait: '9000',
  wait_browser: 'load',
})

console.log('Rendu de', url, '...')
const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`)
console.log('HTTP', res.status)
const html = await res.text()
writeFileSync(new URL('.tenup-dump.html', import.meta.url), html)
console.log(`Écrit ${html.length} octets dans scripts/.tenup-dump.html`)
