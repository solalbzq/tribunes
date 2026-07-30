'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from './ui'
import { Icon } from './icons'
import { ErrorNotice, toUiError, type UiError } from './apiError'

type Conn = { id: string; provider: string; accountName: string; avatarUrl?: string | null; tokenExpiresAt?: string | null }

type ClubAutomation = {
  automationMode: string
  telegramChatId: string | null
  automationEnabled: boolean
}

const STATUS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Réseaux connectés avec succès.' },
  nopages: { ok: false, text: "Aucune Page trouvée. Assurez-vous de gérer une Page Facebook." },
  denied: { ok: false, text: "Connexion annulée." },
  error: { ok: false, text: 'Une erreur est survenue pendant la connexion.' },
  badstate: { ok: false, text: 'Session de connexion expirée, réessayez.' },
  noclub: { ok: false, text: 'Créez d’abord votre club avant de connecter vos réseaux.' },
  notconfigured: { ok: false, text: "La connexion aux réseaux n'est pas configurée." },
}

const AUTOMATION_MODES: { key: string; label: string; description: string }[] = [
  { key: 'MANUAL', label: 'Manuel', description: 'Vous relisez et publiez chaque contenu depuis le dashboard.' },
  { key: 'AUTO_REVIEW', label: 'Auto + validation', description: 'Chaque publication est envoyée sur Telegram pour validation avant sa mise en ligne.' },
  { key: 'FULL_AUTO', label: 'Automatique', description: 'Facebook et Instagram sont publiés automatiquement dès la génération.' },
]

export default function SocialTab({ club }: { club: ClubAutomation }) {
  const [connections, setConnections] = useState<Conn[] | null>(null)
  const [configured, setConfigured] = useState(true)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const [automationMode, setAutomationMode] = useState(club.automationMode)
  const [modeSaving, setModeSaving] = useState(false)
  const [modeError, setModeError] = useState<UiError>(null)

  const [telegramChatId, setTelegramChatId] = useState(club.telegramChatId)
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [telegramBusy, setTelegramBusy] = useState(false)
  const [telegramError, setTelegramError] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

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

  async function changeAutomationMode(mode: string) {
    if (mode === automationMode || modeSaving) return
    setModeSaving(true)
    setModeError(null)
    try {
      const res = await fetch('/api/clubs/automation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationMode: mode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setModeError(toUiError(data, 'Impossible de changer le mode.'))
        return
      }
      setAutomationMode(data.automationMode)
    } catch {
      setModeError(toUiError(null, 'Impossible de changer le mode.'))
    } finally {
      setModeSaving(false)
    }
  }

  async function generateTelegramLink() {
    setTelegramBusy(true)
    setTelegramError(null)
    try {
      const res = await fetch('/api/telegram/link-code', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setTelegramError(data.error ?? 'Impossible de générer le lien.')
        return
      }
      setLinkUrl(data.linkUrl)
    } catch {
      setTelegramError('Impossible de générer le lien.')
    } finally {
      setTelegramBusy(false)
    }
  }

  async function checkTelegramLink() {
    setTelegramBusy(true)
    setTelegramError(null)
    try {
      const res = await fetch('/api/clubs', { cache: 'no-store' })
      const data = res.ok ? await res.json() : null
      if (data?.telegramChatId) {
        setTelegramChatId(data.telegramChatId)
        setLinkUrl(null)
      } else {
        setTelegramError('Aucune connexion détectée pour le moment. Ouvrez le lien dans Telegram puis réessayez.')
      }
    } finally {
      setTelegramBusy(false)
    }
  }

  async function disconnectTelegram() {
    setTelegramBusy(true)
    try {
      await fetch('/api/telegram/link-code', { method: 'DELETE' })
      setTelegramChatId(null)
      setLinkUrl(null)
    } finally {
      setTelegramBusy(false)
    }
  }

  function copyTelegramLink() {
    if (!linkUrl) return
    navigator.clipboard.writeText(linkUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
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

      {/* Automatisation & Telegram */}
      <div className="rounded-card border border-line bg-white p-6 shadow-card">
        <div className="mb-4">
          <p className="font-bold text-ink">Automatisation</p>
          <p className="text-sm text-muted">
            Choisissez comment vos publications générées sont validées et diffusées.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {AUTOMATION_MODES.map((mode) => {
            const locked = mode.key !== 'MANUAL' && !club.automationEnabled
            const active = automationMode === mode.key
            return (
              <button
                key={mode.key}
                onClick={() => changeAutomationMode(mode.key)}
                disabled={modeSaving || locked}
                className={`rounded-btn border p-4 text-left transition ${
                  active ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:bg-subtle'
                } ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <p className={`text-sm font-semibold ${active ? 'text-brand' : 'text-ink'}`}>
                  {mode.label}
                  {locked && <span className="ml-1.5 text-xs font-normal text-muted">(Pro)</span>}
                </p>
                <p className="mt-1 text-xs text-muted">{mode.description}</p>
              </button>
            )
          })}
        </div>

        {modeError && (
          <div className="mt-4">
            <ErrorNotice error={modeError} />
          </div>
        )}

        {automationMode !== 'MANUAL' && (
          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-3 text-sm font-semibold text-ink">Telegram</p>

            {telegramChatId ? (
              <div className="flex items-center justify-between gap-3 rounded-btn border border-line px-4 py-3">
                <p className="flex items-center gap-2 text-sm text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Compte Telegram connecté
                </p>
                <button
                  onClick={disconnectTelegram}
                  disabled={telegramBusy}
                  className="rounded-btn px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-subtle hover:text-danger"
                >
                  Déconnecter
                </button>
              </div>
            ) : linkUrl ? (
              <div className="space-y-3 rounded-btn border border-line px-4 py-3">
                <p className="text-sm text-muted">
                  Ouvrez ce lien dans Telegram pour lier votre club, puis revenez ici pour vérifier la connexion.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
                  >
                    <Icon name="link" className="h-4 w-4" /> Ouvrir dans Telegram
                  </a>
                  <button
                    onClick={copyTelegramLink}
                    className="inline-flex items-center gap-2 rounded-btn border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
                  >
                    <Icon name="copy" className="h-4 w-4" /> {linkCopied ? 'Copié' : 'Copier le lien'}
                  </button>
                  <button
                    onClick={checkTelegramLink}
                    disabled={telegramBusy}
                    className="inline-flex items-center gap-2 rounded-btn border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle disabled:opacity-50"
                  >
                    <Icon name="refresh" className="h-4 w-4" /> Vérifier la connexion
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={generateTelegramLink}
                disabled={telegramBusy}
                className="inline-flex items-center gap-2 rounded-btn bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
              >
                <Icon name="link" className="h-4 w-4" /> Connecter Telegram
              </button>
            )}

            {telegramError && <p className="mt-2 text-xs text-danger">{telegramError}</p>}

            <p className="mt-3 text-xs text-muted">
              {automationMode === 'AUTO_REVIEW'
                ? 'En mode Auto + validation, chaque publication vous est envoyée sur Telegram avec des boutons Publier / Rejeter.'
                : 'Le mode Automatique publie sans validation ; Telegram reste utile pour suivre les publications envoyées.'}
            </p>
          </div>
        )}
      </div>
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
