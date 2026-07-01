'use client'

import { useEffect, useState } from 'react'
import { Icon } from './icons'

type Conn = { id: string; provider: string; accountName: string; avatarUrl?: string | null }
type Posts = { instagram: string; facebook: string; whatsapp: string }
type PostIds = Partial<Record<keyof Posts, string>>
type Result = { id: string; provider: string; accountName: string; ok: boolean; error?: string }

export default function PublishPanel({
  posts,
  postIds,
  getImageBlob,
}: {
  posts: Posts
  postIds?: PostIds | null
  getImageBlob: () => Promise<Blob | null>
}) {
  const [connections, setConnections] = useState<Conn[] | null>(null)
  const [configured, setConfigured] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [publishing, setPublishing] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)

  useEffect(() => {
    fetch('/api/social/connections', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setConfigured(d.configured ?? false)
        const conns: Conn[] = d.connections ?? []
        setConnections(conns)
        setSelected(new Set(conns.map(c => c.id)))
      })
      .catch(() => setConnections([]))
  }, [])

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function publish() {
    if (!connections) return
    setPublishing(true); setResults(null)
    const chosen = connections.filter(c => selected.has(c.id))
    const blob = await getImageBlob()

    // Grouper par provider pour la bonne légende (FB / IG)
    const groups: Array<{ provider: 'facebook' | 'instagram'; caption: string; ids: string[]; generatedPostId?: string }> = []
    const fb = chosen.filter(c => c.provider === 'facebook').map(c => c.id)
    const ig = chosen.filter(c => c.provider === 'instagram').map(c => c.id)
    if (fb.length) groups.push({ provider: 'facebook', caption: posts.facebook, ids: fb, generatedPostId: postIds?.facebook })
    if (ig.length) groups.push({ provider: 'instagram', caption: posts.instagram, ids: ig, generatedPostId: postIds?.instagram })

    const all: Result[] = []
    for (const g of groups) {
      const fd = new FormData()
      fd.append('text', g.caption)
      fd.append('targets', JSON.stringify(g.ids))
      if (g.generatedPostId) fd.append('generatedPostId', g.generatedPostId)
      if (blob) fd.append('image', new File([blob], 'visuel.png', { type: 'image/png' }))
      try {
        const res = await fetch('/api/social/publish', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.results) all.push(...data.results)
        else all.push(...g.ids.map(id => ({ id, provider: g.provider, accountName: '', ok: false, error: data.error ?? 'Échec' })))
      } catch {
        all.push(...g.ids.map(id => ({ id, provider: g.provider, accountName: '', ok: false, error: 'Erreur réseau' })))
      }
    }
    setResults(all)
    setPublishing(false)
  }

  // États de chargement / non connecté
  if (connections === null) {
    return <div className="rounded-card border border-line bg-white p-6 text-sm text-muted shadow-card">Chargement des réseaux…</div>
  }

  if (!configured || connections.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-brand-soft text-brand">
            <Icon name="link" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-ink">Publier en un clic</p>
            <p className="text-sm text-muted">
              {configured ? 'Connectez vos réseaux pour publier directement depuis Tribunes.' : "La connexion aux réseaux n'est pas encore configurée."}
            </p>
          </div>
        </div>
        {configured && (
          <a href="/api/social/meta/connect" className="mt-4 inline-flex items-center gap-2 rounded-btn bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover">
            <Icon name="link" className="h-4 w-4" /> Connecter Facebook et Instagram
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-brand-soft text-brand">
          <Icon name="sparkles" className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold text-ink">Publier sur vos réseaux</p>
          <p className="text-sm text-muted">Sélectionnez les comptes puis publiez en un clic.</p>
        </div>
      </div>

      <div className="space-y-2">
        {connections.map(c => {
          const res = results?.find(r => r.id === c.id)
          return (
            <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-btn border border-line px-3 py-2.5 transition hover:bg-subtle">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4 accent-[#2563eb]" />
              {c.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                : <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-subtle text-muted"><Icon name="users" className="h-4 w-4" /></span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.accountName}</p>
                <p className="text-xs capitalize text-muted">{c.provider === 'instagram' ? 'Instagram' : 'Facebook'}</p>
              </div>
              {res && (
                <span className={`text-xs font-semibold ${res.ok ? 'text-success' : 'text-danger'}`}>
                  {res.ok ? 'Publié' : (res.error ?? 'Échec')}
                </span>
              )}
            </label>
          )
        })}
      </div>

      <button
        onClick={publish}
        disabled={publishing || selected.size === 0}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
      >
        {publishing ? <><Icon name="refresh" className="h-[18px] w-[18px] animate-spin" /> Publication…</> : <><Icon name="arrowRight" className="h-[18px] w-[18px]" /> Publier maintenant</>}
      </button>

      {results && results.every(r => r.ok) && (
        <p className="mt-3 text-center text-sm font-semibold text-success">Publié sur tous les réseaux sélectionnés.</p>
      )}
    </div>
  )
}
