'use client'

import { useEffect, useState } from 'react'

type AuditEntry = {
  id: string
  adminEmail: string | null
  action: string
  resourceType: string
  resourceId: string | null
  beforeValue: unknown
  afterValue: unknown
  result: string
  errorMessage: string | null
  createdAt: string
}

type AuditResponse = {
  entries: AuditEntry[]
  total: number
  page: number
  totalPages: number
}

const RESOURCE_TYPES = ['', 'club', 'organization', 'user']

function fmtLong(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function AuditLogTab() {
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [resourceType, setResourceType] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (resourceType) params.set('resourceType', resourceType)
    fetch(`/api/admin/audit-log?${params}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => { if (mounted) setData(json) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [page, resourceType])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#111827]">Journal d&apos;audit</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Traçabilité des actions administratives sensibles (suspension, suppression, changement de plan...). Lecture seule.
        </p>
      </div>

      <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {RESOURCE_TYPES.map((type) => (
            <button
              key={type || 'all'}
              type="button"
              onClick={() => { setResourceType(type); setPage(1) }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                resourceType === type ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'
              }`}
            >
              {type === '' ? 'Tout' : type === 'club' ? 'Clubs' : type === 'organization' ? 'Organisations' : 'Utilisateurs'}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6b7280]">
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Date</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Admin</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Action</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Ressource</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Résultat</th>
                <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Chargement...</td></tr>
              ) : data?.entries.length ? (
                data.entries.map((entry) => (
                  <>
                    <tr key={entry.id}>
                      <td className="border-b border-[#f3f4f6] px-4 py-3 text-[#6b7280]">{fmtLong(entry.createdAt)}</td>
                      <td className="border-b border-[#f3f4f6] px-4 py-3 font-medium">{entry.adminEmail ?? entry.id.slice(0, 8)}</td>
                      <td className="border-b border-[#f3f4f6] px-4 py-3 font-mono text-xs">{entry.action}</td>
                      <td className="border-b border-[#f3f4f6] px-4 py-3">
                        {entry.resourceType}
                        {entry.resourceId && <span className="ml-1 text-[#9ca3af]">#{entry.resourceId.slice(0, 8)}</span>}
                      </td>
                      <td className="border-b border-[#f3f4f6] px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          entry.result === 'success' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#b91c1c]'
                        }`}>
                          {entry.result === 'success' ? 'Succès' : 'Échec'}
                        </span>
                      </td>
                      <td className="border-b border-[#f3f4f6] px-4 py-3">
                        {(entry.beforeValue || entry.afterValue || entry.errorMessage) && (
                          <button
                            type="button"
                            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                            className="text-xs font-semibold text-[#2563eb] hover:underline"
                          >
                            {expanded === entry.id ? 'Masquer' : 'Détail'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === entry.id && (
                      <tr key={`${entry.id}-detail`}>
                        <td colSpan={6} className="border-b border-[#f3f4f6] bg-[#f8fafc] px-4 py-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-[#4b5563]">
{JSON.stringify({ before: entry.beforeValue, after: entry.afterValue, error: entry.errorMessage }, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              ) : (
                <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Aucune action journalisée sur cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-[#6b7280]">
          <p>{data?.total ?? 0} entrée(s)</p>
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
