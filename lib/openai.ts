import OpenAI from 'openai'

let client: OpenAI | null = null

// Instanciation paresseuse : le SDK lève une erreur sans clé, ce qui casserait
// `next build` (collecte des routes) sur un environnement sans OPENAI_API_KEY.
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    return Reflect.get(client, prop)
  },
})
