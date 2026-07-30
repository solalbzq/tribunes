'use client'

import { useEffect, useState } from 'react'

type Alert = {
  id: string
  severity: 'critical' | 'warning'
  title: string
  scope: string
  detail: string
  cause: string
  action: string
  link: string
}

const SEVERITY_STYLE: Record<Alert['severity'], { badge: string; label: string; stripe: string }> = {
  critical: { badge: 'bg-[#fee2e2] text-[#b91c1c]', label: 'Critique', stripe: 'border-l-4 border-l-[#dc2626]' },
  warning: { badge: 'bg-[#fef3c7] text-[#92400e]', label: 'À surveiller', stripe: 'border-l-4 border-l-[#d97706]' },
}

export default function AlertsTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch('/api/admin/alerts', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => { if (mounted) setAlerts(json.alerts) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  function goTo(link: string) {
    const tab = new URLSearchParams(link.split('?')[1]).get('tab')
    if (tab) onNavigate(tab)
  }

  const criticalCount = alerts?.filter((a) => a.severity === 'critical').length ?? 0
  const warningCount = alerts?.filter((a) => a.severity === 'warning').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#111827]">Alertes</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Conditions binaires uniquement (pas de tendance ni de seuil relatif, pour éviter les faux positifs à faible volume).
          Paiements Stripe échoués et échecs de cron ne sont pas encore couverts — instrumentation manquante.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#b91c1c]">{criticalCount}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Critiques</p>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#92400e]">{warningCount}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">À surveiller</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 text-sm text-[#6b7280] shadow-sm">Chargement...</div>
        ) : alerts?.length ? (
          alerts.map((alert) => (
            <div key={alert.id} className={`rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm ${SEVERITY_STYLE[alert.severity].stripe}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_STYLE[alert.severity].badge}`}>
                      {SEVERITY_STYLE[alert.severity].label}
                    </span>
                    <p className="font-bold text-[#111827]">{alert.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-[#6b7280]">{alert.scope}{alert.detail ? ` — ${alert.detail}` : ''}</p>
                  <p className="mt-2 text-xs text-[#9ca3af]">{alert.cause}</p>
                  <p className="mt-1 text-xs font-semibold text-[#111827]">→ {alert.action}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goTo(alert.link)}
                  className="shrink-0 rounded-lg border border-[#2563eb] px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition hover:bg-[#2563eb] hover:text-white"
                >
                  Diagnostiquer →
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-bold text-[#166534]">Aucune alerte active</p>
            <p className="mt-1 text-sm text-[#6b7280]">Rien ne nécessite d&apos;intervention pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
