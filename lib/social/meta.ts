// Intégration Meta (Facebook Pages + Instagram) : OAuth + publication.
// Docs : Graph API v21.0. Un token utilisateur long-lived donne des tokens
// de Page long-lived ; l'IG business account est lié à une Page.

const GRAPH = 'https://graph.facebook.com/v21.0'

export function metaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET)
}

export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/social/meta/callback`
}

/**
 * URL de consentement Facebook Login for Business. Les permissions viennent
 * de la Configuration (META_CONFIG_ID), pas d'un paramètre scope — scope
 * n'est plus supporté par ce flux (business_management, pages_*, instagram_*
 * liés à une Page exigent désormais Facebook Login for Business).
 */
export function getAuthUrl(state: string): string {
  const configId = process.env.META_CONFIG_ID
  if (!configId) {
    throw new Error('META_CONFIG_ID manquant — requis pour Facebook Login for Business.')
  }
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri(),
    state,
    response_type: 'code',
    config_id: configId,
  })
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`
}

/** Erreur Graph API Meta, avec code/subcode pour permettre une classification (cf. classifyMetaError). */
export class MetaGraphError extends Error {
  code?: number
  subcode?: number

  constructor(message: string, code?: number, subcode?: number) {
    super(message)
    this.name = 'MetaGraphError'
    this.code = code
    this.subcode = subcode
  }
}

/**
 * Catégorise une erreur Graph API pour décider du comportement de retry :
 * - auth       : token invalide/révoqué (code 190) — reconnexion requise, pas de retry.
 * - rate_limit : throttling Meta (codes 4/17/32/613) — transitoire, retry avec backoff (cron).
 * - transient  : erreur réseau/inconnue — retry par défaut, prudence (jamais bloqué à tort).
 * Pas de catégorie "permanent" distincte : Meta ne documente pas de code stable et unique
 * pour "contenu refusé" sur ces endpoints ; on préfère classer en transient plutôt que
 * d'inventer une distinction non vérifiée.
 */
export function classifyMetaError(err: unknown): 'auth' | 'rate_limit' | 'transient' {
  if (err instanceof MetaGraphError) {
    if (err.code === 190) return 'auth'
    if (err.code === 4 || err.code === 17 || err.code === 32 || err.code === 613) return 'rate_limit'
  }
  return 'transient'
}

async function graph<T = unknown>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GRAPH}/${path}?${new URLSearchParams(params)}`
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new MetaGraphError(data.error?.message ?? `Graph API ${res.status}`, data.error?.code, data.error?.error_subcode)
  }
  return data as T
}

async function graphPost<T = unknown>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new MetaGraphError(data.error?.message ?? `Graph API ${res.status}`, data.error?.code, data.error?.error_subcode)
  }
  return data as T
}

/**
 * Prolonge un token utilisateur (court ou long-lived, non expiré) via fb_exchange_token.
 * Note Meta : sur un token de moins de 24h, l'appel renvoie silencieusement le même
 * token avec la même expiration (pas d'erreur) — comportement normal de l'API, pas
 * un bug de cette fonction. Sur un token déjà expiré, l'appel échoue : il faut alors
 * repasser par le flux OAuth complet (cf. cron social-token-refresh).
 */
async function extendToken(token: string): Promise<{ token: string; expiresIn: number }> {
  const long = await graph<{ access_token: string; expires_in?: number }>('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: token,
  })
  return { token: long.access_token, expiresIn: long.expires_in ?? 60 * 24 * 3600 }
}

/** Échange le code OAuth contre un token utilisateur court, puis long-lived. */
export async function exchangeCodeForLongLivedToken(code: string): Promise<{ token: string; expiresIn: number }> {
  const short = await graph<{ access_token: string }>('oauth/access_token', {
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri(),
    code,
  })
  return extendToken(short.access_token)
}

/**
 * Prolonge un token utilisateur long-lived existant avant son expiration
 * (cron social-token-refresh). Échoue si le token est déjà expiré — dans ce
 * cas seule une reconnexion complète (flux OAuth) permet de récupérer l'accès.
 */
export async function refreshLongLivedToken(token: string): Promise<{ token: string; expiresIn: number }> {
  return extendToken(token)
}

export type MetaPage = {
  pageId: string
  pageName: string
  pageToken: string
  avatarUrl?: string
  igUserId?: string
  igUsername?: string
}

/**
 * DEBUG TEMPORAIRE — diagnostic du cas "nopages" (Facebook Login for Business
 * renvoie 0 Page malgré consentement). Appelé uniquement quand getPagesWithInstagram
 * ne renvoie rien, donc aucun coût en fonctionnement normal. À retirer une fois
 * la cause identifiée (cf. app/api/social/meta/callback/route.ts).
 */
export async function debugTokenInfo(userToken: string) {
  const [accounts, permissions] = await Promise.all([
    graph<{ data: unknown[] }>('me/accounts', { access_token: userToken, fields: 'id,name', limit: '50' })
      .catch(e => ({ error: (e as Error).message })),
    graph<{ data: Array<{ permission: string; status: string }> }>('me/permissions', { access_token: userToken })
      .catch(e => ({ error: (e as Error).message })),
  ])
  return { accounts, permissions }
}

/** Récupère les Pages gérées + le compte IG business lié à chacune. */
export async function getPagesWithInstagram(userToken: string): Promise<MetaPage[]> {
  const res = await graph<{ data: Array<{ id: string; name: string; access_token: string }> }>('me/accounts', {
    access_token: userToken,
    fields: 'id,name,access_token',
    limit: '50',
  })

  const pages: MetaPage[] = []
  for (const p of res.data ?? []) {
    const page: MetaPage = { pageId: p.id, pageName: p.name, pageToken: p.access_token }
    // Avatar de la Page
    try {
      const pic = await graph<{ data?: { url?: string } }>(`${p.id}/picture`, {
        access_token: p.access_token, redirect: '0', type: 'large',
      })
      page.avatarUrl = pic.data?.url
    } catch { /* non bloquant */ }
    // Compte IG business lié
    try {
      const ig = await graph<{ instagram_business_account?: { id: string } }>(p.id, {
        access_token: p.access_token, fields: 'instagram_business_account',
      })
      if (ig.instagram_business_account?.id) {
        page.igUserId = ig.instagram_business_account.id
        try {
          const info = await graph<{ username?: string }>(ig.instagram_business_account.id, {
            access_token: p.access_token, fields: 'username',
          })
          page.igUsername = info.username
        } catch { /* ignore */ }
      }
    } catch { /* pas d'IG lié */ }
    pages.push(page)
  }
  return pages
}

/** Publie sur une Page Facebook (photo si imageUrl, sinon texte). */
export async function publishToFacebook(pageId: string, pageToken: string, message: string, imageUrl?: string): Promise<string> {
  if (imageUrl) {
    const r = await graphPost<{ post_id?: string; id?: string }>(`${pageId}/photos`, {
      access_token: pageToken, url: imageUrl, caption: message,
    })
    return r.post_id ?? r.id ?? ''
  }
  const r = await graphPost<{ id: string }>(`${pageId}/feed`, { access_token: pageToken, message })
  return r.id
}

/** Publie sur Instagram (container → publish). Image obligatoire. */
export async function publishToInstagram(igUserId: string, pageToken: string, caption: string, imageUrl: string): Promise<string> {
  const container = await graphPost<{ id: string }>(`${igUserId}/media`, {
    access_token: pageToken, image_url: imageUrl, caption,
  })
  const published = await graphPost<{ id: string }>(`${igUserId}/media_publish`, {
    access_token: pageToken, creation_id: container.id,
  })
  return published.id
}
