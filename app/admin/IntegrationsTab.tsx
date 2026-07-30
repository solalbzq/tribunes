'use client'

import { useEffect, useState } from 'react'

type ConnectionRow = {
  id: string
  provider: string
  accountName: string
  avatarUrl: string | null
  tokenExpiresAt: string | null
  createdAt: string
  club: { id: string; name: string } | null
  expiryStatus: 'unknown' | 'expired' | 'expiring' | 'ok'
}

type IntegrationsResponse = {
  connections: ConnectionRow[]
  total: number
  expiredCount: number
  expiringCount: number
}

const STATUS_LABEL: Record<ConnectionRow['expiryStatus'], { label: string; style: string }> = {
  expired: { label: 'Expiré', style: 'bg-[#fee2e2] text-[#b91c1c]' },
  expiring: { label: 'Expire sous 7 j', style: 'bg-[#fef3c7] text-[#92400e]' },
  ok: { label: 'Valide', style: 'bg-[#dcfce7] text-[#166534]' },
  unknown: { label: 'Sans expiration', style: 'bg-[#f3f4f6] text-[#4b5563]' },
}

function fmtLong(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function IntegrationsTab() {
  const [data, setData] = useState<IntegrationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const params = new URLSearchParams()
    if (provider) params.set('provider', provider)
    fetch(`/api/admin/integrations?${params}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => { if (mounted) setData(json) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [provider])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#111827]">Intégrations sociales</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Connexions Facebook et Instagram des clubs. Les tokens d&apos;accès ne sont jamais affichés — uniquement leur statut.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#111827]">{data?.total ?? 0}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Connexions actives</p>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#b91c1c]">{data?.expiredCount ?? 0}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Tokens expirés</p>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#92400e]">{data?.expiringCount ?? 0}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Expirent sous 7 jours</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {['', 'facebook', 'instagram'].map((p) => (
            <button
              key={p || 'all'}
              type="button"
              onClick={() => setProvider(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                provider === p ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'
              }`}
            >
              {p === '' ? 'Tout' : p === 'facebook' ? 'Facebook' : 'Instagram'}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6b7280]">
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Club</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Plateforme</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Compte</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Connecté depuis</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Expiration</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={5}>Chargement...</td></tr>
              ) : data?.connections.length ? (
                data.connections.map((c) => (
                  <tr key={c.id}>
                    <td className="border-b border-[#f3f4f6] px-4 py-3 font-medium">{c.club?.name ?? '—'}</td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3 capitalize">{c.provider}</td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3">{c.accountName}</td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3 text-[#6b7280]">{fmtLong(c.createdAt)}</td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_LABEL[c.expiryStatus].style}`}>
                        {STATUS_LABEL[c.expiryStatus].label}
                      </span>
                      {c.tokenExpiresAt && <span className="ml-2 text-xs text-[#9ca3af]">{fmtLong(c.tokenExpiresAt)}</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={5}>Aucune connexion.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
