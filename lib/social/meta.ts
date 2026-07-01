// Intégration Meta (Facebook Pages + Instagram) : OAuth + publication.
// Docs : Graph API v21.0. Un token utilisateur long-lived donne des tokens
// de Page long-lived ; l'IG business account est lié à une Page.

const GRAPH = 'https://graph.facebook.com/v21.0'

export const META_SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'business_management',
  'instagram_basic',
  'instagram_content_publish',
].join(',')

export function metaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET)
}

export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/social/meta/callback`
}

/** URL de consentement Facebook Login. */
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri(),
    state,
    scope: META_SCOPES,
    response_type: 'code',
  })
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`
}

async function graph<T = unknown>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GRAPH}/${path}?${new URLSearchParams(params)}`
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Graph API ${res.status}`)
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
    throw new Error(data.error?.message ?? `Graph API ${res.status}`)
  }
  return data as T
}

/** Échange le code OAuth contre un token utilisateur court, puis long-lived. */
export async function exchangeCodeForLongLivedToken(code: string): Promise<{ token: string; expiresIn: number }> {
  const short = await graph<{ access_token: string }>('oauth/access_token', {
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri(),
    code,
  })
  const long = await graph<{ access_token: string; expires_in?: number }>('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: short.access_token,
  })
  return { token: long.access_token, expiresIn: long.expires_in ?? 60 * 24 * 3600 }
}

export type MetaPage = {
  pageId: string
  pageName: string
  pageToken: string
  avatarUrl?: string
  igUserId?: string
  igUsername?: string
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
