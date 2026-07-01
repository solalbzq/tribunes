'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from './ui'
import { Icon } from './icons'

type Conn = { id: string; provider: string; accountName: string; avatarUrl?: string | null; tokenExpiresAt?: string | null }

const STATUS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Réseaux connectés avec succès.' },
  nopages: { ok: false, text: "Aucune Page trouvée. Assurez-vous de gérer une Page Facebook." },
  denied: { ok: false, text: "Connexion annulée." },
  error: { ok: false, text: 'Une erreur est survenue pendant la connexion.' },
  badstate: { ok: false, text: 'Session de connexion expirée, réessayez.' },
  notconfigured: { ok: false, text: "La connexion aux réseaux n'est pas configurée." },
}

export default function SocialTab() {
  const [connections, setConnections] = useState<Conn[] | null>(null)
  const [configured, setConfigured] = useState(true)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    const d = await fetch('/api/social/connections', { cache: 'no-store' }).then(r => r.json())
    setConfigured(d.configured ?? false)
    setConnections(d.connections ?? [])
  }

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    const s = params.get('social')
    if (s && STATUS[s]) {
      setStatus(STATUS[s])
      const url = new URL(window.location.href)
      url.searchParams.delete('social'); url.searchParams.delete('tab')
      window.history.replaceState({}, '', url)
    }
  }, [])

  async function disconnect(id: string) {
    await fetch('/api/social/disconnect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    load()
  }

  const facebook = connections?.filter(c => c.provider === 'facebook') ?? []
  const instagram = connections?.filter(c => c.provider === 'instagram') ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon="link"
        title="Réseaux sociaux"
        subtitle="Connectez vos comptes pour publier directement depuis Tribunes."
      />

      {status && (
        <div className={`rounded-card border p-4 text-sm ${status.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          {status.text}
        </div>
      )}

      {!configured ? (
        <div className="rounded-card border border-line bg-white p-6 shadow-card">
          <p className="text-sm text-muted">
            La connexion Meta n&apos;est pas encore activée sur cette instance. Ajoutez <code className="rounded bg-subtle px-1.5 py-0.5 text-ink">META_APP_ID</code> et <code className="rounded bg-subtle px-1.5 py-0.5 text-ink">META_APP_SECRET</code> pour l&apos;activer.
          </p>
        </div>
      ) : connections === null ? (
        <div className="rounded-card border border-line bg-white p-6 text-sm text-muted shadow-card">Chargement…</div>
      ) : (
        <>
          {/* Carte de connexion */}
          <div className="rounded-card border border-line bg-white p-6 shadow-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-card bg-brand-soft text-brand">
                  <Icon name="link" className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-bold text-ink">Meta — Facebook &amp; Instagram</p>
                  <p className="text-sm text-muted">Une seule connexion relie votre Page Facebook et votre compte Instagram professionnel.</p>
                </div>
              </div>
              <a href="/api/social/meta/connect" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-btn bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
                <Icon name="link" className="h-[18px] w-[18px]" />
                {connections.length > 0 ? 'Reconnecter' : 'Connecter'}
              </a>
            </div>
          </div>

          {/* Comptes connectés */}
          {connections.length === 0 ? (
            <div className="rounded-card border border-line bg-white p-8 text-center shadow-card">
              <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-muted">
                <Icon name="users" className="h-5 w-5" />
              </span>
              <p className="mt-3 font-bold text-ink">Aucun compte connecté</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Cliquez sur « Connecter », choisissez votre Page Facebook, et vos comptes apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <ConnGroup title="Pages Facebook" items={facebook} onDisconnect={disconnect} />
              <ConnGroup title="Comptes Instagram" items={instagram} onDisconnect={disconnect} />
            </div>
          )}

          <p className="text-xs text-muted">
            Instagram nécessite un compte professionnel (Business ou Créateur) relié à votre Page Facebook.
          </p>
        </>
      )}
    </div>
  )
}

function ConnGroup({ title, items, onDisconnect }: { title: string; items: Conn[]; onDisconnect: (id: string) => void }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-card">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand">{title}</p>
      <div className="space-y-2">
        {items.map(c => (
          <div key={c.id} className="flex items-center gap-3 rounded-btn border border-line px-3 py-2.5">
            {c.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={c.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              : <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-subtle text-muted"><Icon name="users" className="h-4 w-4" /></span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{c.accountName}</p>
              <p className="flex items-center gap-1 text-xs text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Connecté</p>
            </div>
            <button onClick={() => onDisconnect(c.id)} className="rounded-btn px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-subtle hover:text-danger">
              Déconnecter
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
