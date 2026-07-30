'use client'

import { useEffect, useState } from 'react'

type PostRow = {
  id: string
  platform: string
  postType: string
  postTypeLabel: string
  status: string
  createdAt: string
  publishedAt: string | null
  rejectedReason: string | null
  clubId: string | null
  clubName: string | null
}

type PublicationsResponse = {
  posts: PostRow[]
  total: number
  page: number
  totalPages: number
  byStatus: Record<string, number>
  byPlatform: Record<string, number>
}

const STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHING', 'PUBLISHED', 'PARTIAL', 'FAILED', 'REJECTED']

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-[#f3f4f6] text-[#4b5563]',
  PENDING_REVIEW: 'bg-[#fef3c7] text-[#92400e]',
  PUBLISHING: 'bg-[#dbeafe] text-[#1d4ed8]',
  PUBLISHED: 'bg-[#dcfce7] text-[#166534]',
  PARTIAL: 'bg-[#ffedd5] text-[#9a3412]',
  FAILED: 'bg-[#fee2e2] text-[#b91c1c]',
  REJECTED: 'bg-[#f3f4f6] text-[#4b5563]',
}

function fmtLong(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

export default function PublicationsTab() {
  const [data, setData] = useState<PublicationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    if (platform) params.set('platform', platform)
    fetch(`/api/admin/publications?${params}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => { if (mounted) setData(json) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [page, status, platform])

  const failedCount = (data?.byStatus.FAILED ?? 0) + (data?.byStatus.PARTIAL ?? 0)
  const platforms = data ? Object.keys(data.byPlatform) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#111827]">Publications</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Cycle de vie des publications générées. Fenêtre limitée aux 30 derniers jours : le cron de nettoyage
          purge définitivement les brouillons/échecs après 30 jours et les publications réussies après leur
          publication + 30 jours. Les publications WhatsApp restent volontairement en attente (pas d&apos;API de
          publication) — ce n&apos;est pas un échec.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#111827]">{fmt(data?.byStatus.PUBLISHED ?? 0)}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Publiées</p>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#b91c1c]">{fmt(failedCount)}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Échouées / partielles</p>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#111827]">{fmt(data?.byStatus.PENDING_REVIEW ?? 0)}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">En attente de validation</p>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#111827]">{fmt(data?.byStatus.PUBLISHING ?? 0)}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Publication en cours</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#9ca3af]">Statut</span>
          <button type="button" onClick={() => { setStatus(''); setPage(1) }} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${status === '' ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'}`}>Tout</button>
          {STATUSES.map((s) => (
            <button key={s} type="button" onClick={() => { setStatus(s); setPage(1) }} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${status === s ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'}`}>
              {s} {data ? `(${data.byStatus[s] ?? 0})` : ''}
            </button>
          ))}
        </div>
        {platforms.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#9ca3af]">Plateforme</span>
            <button type="button" onClick={() => { setPlatform(''); setPage(1) }} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${platform === '' ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'}`}>Tout</button>
            {platforms.map((p) => (
              <button key={p} type="button" onClick={() => { setPlatform(p); setPage(1) }} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${platform === p ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'}`}>
                {p} ({data?.byPlatform[p] ?? 0})
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6b7280]">
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Date</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Club</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Type</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Plateforme</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Statut</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Détail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Chargement...</td></tr>
              ) : data?.posts.length ? (
                data.posts.map((post) => (
                  <tr key={post.id}>
                    <td className="border-b border-[#f3f4f6] px-4 py-3 text-[#6b7280]">{fmtLong(post.createdAt)}</td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3 font-medium">{post.clubName ?? '—'}</td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3">{post.postTypeLabel}</td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3">{post.platform}</td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[post.status] ?? 'bg-[#f3f4f6] text-[#4b5563]'}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="border-b border-[#f3f4f6] px-4 py-3 text-xs text-[#9ca3af]">
                      {post.rejectedReason ?? (post.publishedAt ? `Publié le ${fmtLong(post.publishedAt)}` : '—')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Aucune publication sur cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-[#6b7280]">
          <p>{data?.total ?? 0} publication(s)</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 font-semibold text-[#111827] transition hover:border-[#2563eb] disabled:opacity-50">
              Précédent
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(p + 1, data?.totalPages ?? p))} disabled={page >= (data?.totalPages ?? 1)} className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 font-semibold text-[#111827] transition hover:border-[#2563eb] disabled:opacity-50">
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
