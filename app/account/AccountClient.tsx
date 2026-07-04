'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'
import { PLANS, PLAN_KEYS, normalizePlan, yearlyAsMonthly, type BillingInterval, type PlanKey } from '@/lib/plans'

type Org = {
  id: string
  name: string
  plan: string
  stripeCustomerId: string | null
  members: Array<{ userId: string; role: string; createdAt: string }>
  clubs: Array<{ id: string; name: string; sport: string }>
}

type ResolvedMember = {
  id: string
  userId: string
  role: string
  createdAt: string
  email: string | null
}

type OrganizationOption = {
  id: string
  name: string
  role: string
  plan: string
  memberCount: number
}

const PLAN_COLORS: Record<PlanKey, string> = {
  FREE: '#6b7280',
  CLUB: '#3b82f6',
  PRO: '#2563eb',
}

export default function AccountClient({
  userEmail, userId, club, org, organizations, role, usage,
}: {
  userEmail: string
  userId: string
  club: { name: string; sport: string } | null
  org: Org
  organizations: OrganizationOption[]
  role: string | null
  usage: { used: number; limit: number | null } | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'profil' | 'structure' | 'abonnement'>(
    searchParams.get('tab') === 'abonnement' ? 'abonnement' : 'profil'
  )
  const [billing, setBilling] = useState<BillingInterval>('monthly')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteOk, setInviteOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<ResolvedMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberActionError, setMemberActionError] = useState('')
  const [memberActionId, setMemberActionId] = useState<string | null>(null)
  const [switchingOrg, setSwitchingOrg] = useState(false)

  const plan = normalizePlan(org.plan)
  const planDef = PLANS[plan]
  const planColor = PLAN_COLORS[plan]
  const isOwner = role === 'OWNER'
  const ownerCount = members.filter((m) => m.role === 'OWNER').length
  const maxMembers = planDef.quotas.maxMembers
  const canInvite = maxMembers == null || org.members.length < maxMembers
  const organizationsSorted = [...organizations].sort((a, b) => (a.id === org.id ? -1 : b.id === org.id ? 1 : a.name.localeCompare(b.name)))

  useEffect(() => {
    if (tab !== 'structure') return
    let mounted = true
    setMembersLoading(true)
    fetch('/api/organization/members')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (mounted) setMembers(data) })
      .finally(() => { if (mounted) setMembersLoading(false) })
    return () => { mounted = false }
  }, [tab])

  async function switchOrganization(orgId: string) {
    if (orgId === org.id) return
    setSwitchingOrg(true)
    const res = await fetch('/api/organization/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    setSwitchingOrg(false)
    if (!res.ok) return
    router.refresh()
  }

  async function changeRole(memberId: string, newRole: string) {
    setMemberActionError(''); setMemberActionId(memberId)
    const res = await fetch(`/api/organization/members/${memberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    const data = await res.json()
    setMemberActionId(null)
    if (!res.ok) { setMemberActionError(data.error); return }
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
  }

  async function removeMember(memberId: string) {
    if (!window.confirm('Retirer ce membre de la structure ?')) return
    setMemberActionError(''); setMemberActionId(memberId)
    const res = await fetch(`/api/organization/members/${memberId}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setMemberActionId(null)
    if (!res.ok) { setMemberActionError(data.error ?? 'Erreur'); return }
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  async function invite() {
    setInviteError(''); setInviteOk(false); setLoading(true)
    const res = await fetch('/api/organization/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setInviteError(data.error); return }
    setInviteOk(true); setInviteEmail('')
    router.refresh()
  }

  async function goToPortal(action: 'checkout' | 'portal', planKey?: PlanKey) {
    const res = await fetch('/api/organization/portal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, plan: planKey, interval: billing }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="inline-flex"><Logo size={24} /></Link>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Mon compte</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#111827] transition">← Dashboard</Link>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-[#2563eb] transition">Déconnexion</button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'profil',      label: '👤 Profil' },
            { key: 'structure',   label: '🏢 Ma structure' },
            { key: 'abonnement',  label: '💳 Abonnement' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                tab === t.key ? 'bg-[#111827] text-white' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PROFIL */}
        {tab === 'profil' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h3 className="font-bold text-[#111827]">Informations</h3>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Email</label>
                <p className="font-semibold text-[#111827]">{userEmail}</p>
              </div>
                {club && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Club principal</label>
                    <p className="font-semibold text-[#111827]">{club.name} <span className="text-gray-400 font-normal text-sm">({club.sport})</span></p>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h3 className="font-bold text-[#111827]">Plan actuel</h3>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-sm font-bold text-white" style={{ background: planColor }}>
                  {planDef.label}
                </span>
                <span className="text-sm font-bold text-[#111827]">
                  {plan === 'FREE' ? 'Gratuit' : `${planDef.priceDisplay.monthly}/mois`}
                </span>
              </div>
              <p className="text-sm text-gray-500">{planDef.tagline}</p>
                <button onClick={() => setTab('abonnement')}
                  className="text-sm font-semibold text-[#2563eb] hover:underline">
                  Gérer l'abonnement →
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="font-bold text-[#111827] text-lg">Tes organisations</h3>
                  <p className="text-sm text-gray-500 mt-1">Choisis l’espace actif pour gérer les membres, les invitations et la facturation.</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{organizations.length} espace{organizations.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {organizationsSorted.map((organization) => {
                  const organizationPlan = PLANS[normalizePlan(organization.plan)]
                  const isActiveOrg = organization.id === org.id
                  return (
                    <button
                      key={organization.id}
                      type="button"
                      onClick={() => switchOrganization(organization.id)}
                      disabled={switchingOrg}
                      className={`rounded-2xl border p-4 text-left transition ${isActiveOrg ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-gray-100 bg-[#fbfdff] hover:border-[#cbd5e1]'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-[#111827] truncate">{organization.name}</p>
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${isActiveOrg ? 'bg-[#2563eb] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                          {switchingOrg && isActiveOrg ? 'Active' : isActiveOrg ? 'Active' : 'Changer'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">{organization.role === 'OWNER' ? 'Propriétaire' : 'Membre'}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-white border border-gray-200 text-[#2563eb]">{organizationPlan.label}</span>
                      </div>
                      <p className="mt-3 text-sm text-gray-500">{organization.memberCount} compte{organization.memberCount > 1 ? 's' : ''} · structure de travail partagée</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STRUCTURE */}
        {tab === 'structure' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#111827] text-lg">{org.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: planColor }}>
                    Plan {planDef.label}
                  </span>
                </div>
                <span className="text-sm text-gray-400">{org.members.length} membre{org.members.length > 1 ? 's' : ''}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 mb-6">
                <div className="rounded-xl border border-gray-100 bg-[#f8fafc] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-gray-400 font-semibold">Rôle</p>
                  <p className="mt-2 font-bold text-[#111827]">{isOwner ? 'Propriétaire' : 'Membre'}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-[#f8fafc] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-gray-400 font-semibold">Comptes</p>
                  <p className="mt-2 font-bold text-[#111827]">{org.members.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-[#f8fafc] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-gray-400 font-semibold">Clubs rattachés</p>
                  <p className="mt-2 font-bold text-[#111827]">{org.clubs.length}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#111827]">Clubs de la structure</p>
                  <span className="text-xs text-gray-400">Le plan et les accès se gèrent au niveau organisation</span>
                </div>
                {org.clubs.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {org.clubs.map((clubItem) => (
                      <div key={clubItem.id} className="rounded-xl border border-gray-100 bg-[#fbfdff] px-4 py-3">
                        <p className="font-semibold text-[#111827]">{clubItem.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{clubItem.sport}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-[#fafafa] px-4 py-4 text-sm text-gray-500">
                    Aucun club n'est encore rattaché à cette organisation.
                  </div>
                )}
              </div>

              {/* Membres */}
              <div className="space-y-2 mb-6">
                {membersLoading ? (
                  <p className="text-sm text-gray-400 py-2">Chargement des membres...</p>
                ) : (
                  members.map((m, i) => {
                    const isLastOwner = m.role === 'OWNER' && ownerCount <= 1
                    const busy = memberActionId === m.id
                    return (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#111827] to-[#2563eb] flex items-center justify-center text-white text-xs font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#111827]">{m.email ?? 'Email indisponible'}</p>
                            <p className="text-xs text-gray-400">{m.role === 'OWNER' ? 'Propriétaire' : 'Membre'}</p>
                          </div>
                        </div>
                        {isOwner && (
                          <div className="flex items-center gap-2">
                            {!isLastOwner && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => changeRole(m.id, m.role === 'OWNER' ? 'MEMBER' : 'OWNER')}
                                className="text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-full transition disabled:opacity-50"
                              >
                                {m.role === 'OWNER' ? 'Rétrograder' : 'Promouvoir'}
                              </button>
                            )}
                            {!isLastOwner && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => removeMember(m.id)}
                                className="text-xs font-semibold text-[#2563eb] bg-[#2563eb]/10 hover:bg-[#2563eb]/20 px-2.5 py-1.5 rounded-full transition disabled:opacity-50"
                              >
                                Retirer
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                {memberActionError && <p className="text-xs text-red-500 mt-2">{memberActionError}</p>}
              </div>

              {/* Inviter */}
              {isOwner && (
                <div>
                  <p className="text-sm font-semibold text-[#111827] mb-2">Inviter un collaborateur</p>
                  {canInvite ? (
                    <div className="flex gap-3">
                      <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                        placeholder="email@collaborateur.com"
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                      <button onClick={invite} disabled={loading || !inviteEmail}
                        className="bg-[#111827] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#1f2937] transition disabled:opacity-60">
                        {loading ? '...' : 'Inviter'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                      <p className="text-sm text-amber-700">L'invitation de membres supplémentaires nécessite le plan Pro.</p>
                      <button onClick={() => setTab('abonnement')}
                        className="text-sm font-bold text-[#2563eb] hover:underline shrink-0 ml-3">
                        Passer à Pro →
                      </button>
                    </div>
                  )}
                  {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
                  {inviteOk && <p className="text-xs text-green-600 mt-2">✓ Invitation envoyée par email.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABONNEMENT */}
        {tab === 'abonnement' && (
          <div className="space-y-6 max-w-3xl">
            {/* Conso du mois (plans avec quota) */}
            {usage && usage.limit != null && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-[#111827]">Générations IA ce mois-ci</h3>
                  <span className="text-sm font-bold text-[#111827]">{Math.min(usage.used, usage.limit)} / {usage.limit}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563eb] rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Le compteur se réinitialise chaque début de mois. Passez au plan Club pour des générations illimitées.
                </p>
              </div>
            )}

            {/* Toggle mensuel / annuel */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                {(['monthly', 'yearly'] as const).map(i => (
                  <button key={i} onClick={() => setBilling(i)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                      billing === i ? 'bg-[#111827] text-white' : 'text-gray-500 hover:text-[#111827]'
                    }`}>
                    {i === 'monthly' ? 'Mensuel' : 'Annuel'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLAN_KEYS.map(key => {
                const def = PLANS[key]
                const isCurrent = plan === key
                const isPaid = def.price.monthly != null
                const monthlyEq = yearlyAsMonthly(def)
                return (
                  <div key={key} className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${isCurrent ? 'border-[#2563eb]' : 'border-gray-100'}`}>
                    {isCurrent && <span className="text-xs font-bold text-[#2563eb] mb-2">Plan actuel</span>}
                    <h3 className="font-extrabold text-[#111827] text-lg">{def.label}</h3>
                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-3xl font-black text-[#111827]">{isPaid ? def.priceDisplay[billing] : 'Gratuit'}</span>
                      {isPaid && <span className="text-sm text-gray-400">{billing === 'monthly' ? '/mois' : '/an'}</span>}
                    </div>
                    <p className="h-4 text-xs text-gray-400 mb-2">
                      {isPaid && billing === 'yearly' && monthlyEq ? `soit ${monthlyEq}/mois` : ''}
                    </p>
                    <ul className="space-y-1.5 flex-1 mb-4">
                      {def.features.map(f => (
                        <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-[#22c55e]">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && isPaid && (
                      <button
                        onClick={() => goToPortal('checkout', key)}
                        className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition"
                        style={{ background: PLAN_COLORS[key] }}>
                        Passer à {def.label}
                      </button>
                    )}
                    {isCurrent && plan !== 'FREE' && org.stripeCustomerId && (
                      <button onClick={() => goToPortal('portal')}
                        className="w-full py-2.5 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                        Gérer / Annuler
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 text-center">
              Paiements sécurisés via Stripe · Résiliation à tout moment · Aucun prélèvement sans confirmation
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
