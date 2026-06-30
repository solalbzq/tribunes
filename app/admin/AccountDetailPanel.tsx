'use client'

import { useEffect, useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

type OrgDetail = {
  id: string
  name: string
  plan: string
  suspended: boolean
  stripeCustomerId: string | null
  createdAt: string
  members: Array<{ id: string; userId: string; role: string; email: string | null; createdAt: string }>
  clubs: Array<{ id: string; name: string; sport: string; createdAt: string }>
}

type ClubDetail = {
  id: string
  userId: string
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  suspended: boolean
  ownerEmail: string | null
  org: { id: string; name: string; plan: string } | null
  _count: { matches: number }
  matches: Array<{
    id: string
    date: string
    opponent: string
    homeScore: number
    awayScore: number
    competition: string | null
    _count: { posts: number }
  }>
}

const PLANS = ['FREE', 'PRO', 'STRUCTURE']

function fmtLong(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function AccountDetailPanel({
  type,
  id,
  onClose,
  onChanged,
}: {
  type: 'organization' | 'club'
  id: string
  onClose: () => void
  onChanged: () => void
}) {
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [club, setClub] = useState<ClubDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<'delete-org-detach' | 'delete-org-cascade' | 'delete-club' | null>(null)
  const [edit, setEdit] = useState<Partial<ClubDetail>>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(type === 'organization' ? `/api/admin/organizations/${id}` : `/api/admin/clubs/${id}`)
    const data = await res.json()
    if (type === 'organization') setOrg(data)
    else { setClub(data); setEdit(data) }
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id])

  async function changePlan(plan: string) {
    await fetch(`/api/admin/organizations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    void load(); onChanged()
  }

  async function toggleSuspendOrg() {
    if (!org) return
    await fetch(`/api/admin/organizations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: !org.suspended }),
    })
    void load(); onChanged()
  }

  async function toggleSuspendClub() {
    if (!club) return
    await fetch(`/api/admin/clubs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: !club.suspended }),
    })
    void load(); onChanged()
  }

  async function saveClubEdits() {
    setSaving(true)
    await fetch(`/api/admin/clubs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: edit.name, sport: edit.sport, primaryColor: edit.primaryColor,
        secondaryColor: edit.secondaryColor, logoUrl: edit.logoUrl,
      }),
    })
    setSaving(false)
    void load(); onChanged()
  }

  async function deleteOrg(mode: 'detach' | 'cascade') {
    await fetch(`/api/admin/organizations/${id}?mode=${mode}`, { method: 'DELETE' })
    setConfirmAction(null); onChanged(); onClose()
  }

  async function deleteClub() {
    await fetch(`/api/admin/clubs/${id}`, { method: 'DELETE' })
    setConfirmAction(null); onChanged(); onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1a1a2e]">
            {type === 'organization' ? 'Organisation' : 'Club'}
          </h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-[#9ca3af] hover:text-[#1a1a2e]">
            &times;
          </button>
        </div>

        {loading && <p className="text-sm text-[#6b7280]">Chargement...</p>}

        {!loading && type === 'organization' && org && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-[#1a1a2e]">{org.name}</h3>
              <p className="text-xs text-[#9ca3af]">Créée le {fmtLong(org.createdAt)}</p>
              {org.suspended && (
                <span className="mt-2 inline-block rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#991b1b]">
                  Suspendue
                </span>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#1a1a2e]">Plan</p>
              <div className="flex gap-2">
                {PLANS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => changePlan(p)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      org.plan === p ? 'bg-[#1a1a2e] text-white' : 'border border-[#e5e7eb] text-[#1a1a2e] hover:bg-[#f8f8f8]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#1a1a2e]">Membres ({org.members.length})</p>
              <div className="space-y-2">
                {org.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-[#f3f4f6] px-3 py-2 text-sm">
                    <span>{m.email ?? m.userId}</span>
                    <span className="text-xs font-semibold text-[#6b7280]">{m.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#1a1a2e]">Clubs ({org.clubs.length})</p>
              <div className="space-y-2">
                {org.clubs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-[#f3f4f6] px-3 py-2 text-sm">
                    <span>{c.name}</span>
                    <span className="text-xs text-[#6b7280]">{c.sport}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#f3f4f6] pt-4">
              <button
                type="button"
                onClick={toggleSuspendOrg}
                className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition hover:bg-[#f8f8f8]"
              >
                {org.suspended ? 'Réactiver' : 'Suspendre'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('delete-org-detach')}
                className="rounded-lg border border-[#e94560] px-4 py-2 text-sm font-semibold text-[#e94560] transition hover:bg-[#e94560]/10"
              >
                Supprimer (détacher les clubs)
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('delete-org-cascade')}
                className="rounded-lg bg-[#e94560] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c73652]"
              >
                Supprimer (avec les clubs)
              </button>
            </div>
          </div>
        )}

        {!loading && type === 'club' && club && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-[#9ca3af]">Propriétaire</p>
              <p className="font-semibold text-[#1a1a2e]">{club.ownerEmail ?? club.userId}</p>
              {club.org && <p className="text-xs text-[#9ca3af]">Organisation : {club.org.name} ({club.org.plan})</p>}
              {club.suspended && (
                <span className="mt-2 inline-block rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#991b1b]">
                  Suspendu
                </span>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#1a1a2e]">Édition</p>
              <input
                value={edit.name ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nom du club"
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#e94560]"
              />
              <input
                value={edit.sport ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, sport: e.target.value }))}
                placeholder="Sport"
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#e94560]"
              />
              <div className="flex gap-3">
                <label className="flex flex-1 items-center gap-2 text-xs text-[#6b7280]">
                  Couleur 1
                  <input
                    type="color"
                    value={edit.primaryColor ?? '#1a1a2e'}
                    onChange={(e) => setEdit((p) => ({ ...p, primaryColor: e.target.value }))}
                    className="h-8 w-12 rounded border border-[#e5e7eb]"
                  />
                </label>
                <label className="flex flex-1 items-center gap-2 text-xs text-[#6b7280]">
                  Couleur 2
                  <input
                    type="color"
                    value={edit.secondaryColor ?? '#e94560'}
                    onChange={(e) => setEdit((p) => ({ ...p, secondaryColor: e.target.value }))}
                    className="h-8 w-12 rounded border border-[#e5e7eb]"
                  />
                </label>
              </div>
              <input
                value={edit.logoUrl ?? ''}
                onChange={(e) => setEdit((p) => ({ ...p, logoUrl: e.target.value }))}
                placeholder="URL du logo"
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#e94560]"
              />
              <button
                type="button"
                onClick={saveClubEdits}
                disabled={saving}
                className="rounded-lg bg-[#1a1a2e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a4e] disabled:opacity-60"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#1a1a2e]">Derniers matchs ({club._count.matches})</p>
              <div className="space-y-2">
                {club.matches.map((m) => (
                  <div key={m.id} className="rounded-lg border border-[#f3f4f6] px-3 py-2 text-sm">
                    <p className="font-semibold">vs {m.opponent} — {m.homeScore}-{m.awayScore}</p>
                    <p className="text-xs text-[#9ca3af]">{fmtLong(m.date)} · {m._count.posts} post(s) généré(s)</p>
                  </div>
                ))}
                {club.matches.length === 0 && <p className="text-sm text-[#9ca3af]">Aucun match.</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#f3f4f6] pt-4">
              <button
                type="button"
                onClick={toggleSuspendClub}
                className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition hover:bg-[#f8f8f8]"
              >
                {club.suspended ? 'Réactiver' : 'Suspendre'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('delete-club')}
                className="rounded-lg bg-[#e94560] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c73652]"
              >
                Supprimer le club
              </button>
            </div>
          </div>
        )}

        {confirmAction === 'delete-org-detach' && org && (
          <ConfirmDialog
            title="Supprimer l'organisation"
            message="Les clubs liés seront détachés (conservés) mais l'organisation et ses membres seront supprimés."
            confirmLabel="Supprimer"
            danger
            requireText={org.name}
            onConfirm={() => deleteOrg('detach')}
            onCancel={() => setConfirmAction(null)}
          />
        )}
        {confirmAction === 'delete-org-cascade' && org && (
          <ConfirmDialog
            title="Supprimer l'organisation et ses clubs"
            message="Action irréversible : l'organisation, ses membres et TOUS ses clubs (matchs, posts inclus) seront supprimés."
            confirmLabel="Tout supprimer"
            danger
            requireText={org.name}
            onConfirm={() => deleteOrg('cascade')}
            onCancel={() => setConfirmAction(null)}
          />
        )}
        {confirmAction === 'delete-club' && club && (
          <ConfirmDialog
            title="Supprimer le club"
            message="Action irréversible : le club, ses matchs et posts générés seront supprimés."
            confirmLabel="Supprimer"
            danger
            requireText={club.name}
            onConfirm={deleteClub}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </div>
    </div>
  )
}
