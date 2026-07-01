// Clique "Voir les rencontres précédentes" via un scénario JS ScrapingBee,
// puis dump le HTML rendu. Usage :
//   SCRAPINGBEE_API_KEY=xxx node scripts/tenup-prev.mjs "https://tenup.fft.fr/club/60300491/competitions"
import { writeFileSync } from 'node:fs'

const key = process.env.SCRAPINGBEE_API_KEY
const url = process.argv[2] || 'https://tenup.fft.fr/club/60300491/competitions'
if (!key) { console.error('SCRAPINGBEE_API_KEY manquant.'); process.exit(1) }

const js_scenario = {
  instructions: [
    { wait: 4000 },
    { evaluate: "var b=[...document.querySelectorAll('button')].find(x=>/pr\\u00e9c\\u00e9dent/i.test(x.textContent)); if(b) b.click();" },
    { wait: 5000 },
  ],
}

const params = new URLSearchParams({
  api_key: key,
  url,
  render_js: 'true',
  premium_proxy: 'true',
  country_code: 'fr',
  js_scenario: JSON.stringify(js_scenario),
})

console.log('Rendu + clic "rencontres précédentes"...')
const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`)
console.log('HTTP', res.status)
const html = await res.text()
writeFileSync(new URL('.tenup-prev.html', import.meta.url), html)
console.log(`Écrit ${html.length} octets dans scripts/.tenup-prev.html`)
