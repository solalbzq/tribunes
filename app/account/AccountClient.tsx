'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

type Org = {
  id: string
  name: string
  plan: string
  stripeCustomerId: string | null
  members: Array<{ userId: string; role: string; createdAt: string }>
} | null

type ResolvedMember = {
  id: string
  userId: string
  role: string
  createdAt: string
  email: string | null
}

const PLAN_LABELS: Record<string, { label: string; color: string; desc: string; price: string }> = {
  FREE:       { label: 'Gratuit',    color: '#6b7280', desc: '1 compte, fonctionnalités limitées', price: '0€' },
  PRO:        { label: 'Pro',        color: '#3b82f6', desc: '1 compte, tout illimité',            price: '10€/mois' },
  STRUCTURE:  { label: 'Structure',  color: '#2563eb', desc: 'Comptes illimités dans votre équipe', price: '25€/mois' },
}

export default function AccountClient({
  userEmail, userId, club, org, role,
}: {
  userEmail: string
  userId: string
  club: { name: string; sport: string } | null
  org: Org
  role: string | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'profil' | 'structure' | 'abonnement'>('profil')
  const [orgName, setOrgName] = useState(org?.name ?? club?.name ?? '')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteOk, setInviteOk] = useState(false)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<ResolvedMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberActionError, setMemberActionError] = useState('')
  const [memberActionId, setMemberActionId] = useState<string | null>(null)

  const plan = org?.plan ?? 'FREE'
  const planInfo = PLAN_LABELS[plan]
  const isOwner = role === 'OWNER' || !org
  const ownerCount = members.filter((m) => m.role === 'OWNER').length

  useEffect(() => {
    if (tab !== 'structure' || !org) return
    let mounted = true
    setMembersLoading(true)
    fetch('/api/organization/members')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (mounted) setMembers(data) })
      .finally(() => { if (mounted) setMembersLoading(false) })
    return () => { mounted = false }
  }, [tab, org])

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

  async function createOrg() {
    setCreating(true)
    await fetch('/api/organization', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: orgName }),
    })
    setCreating(false)
    router.refresh()
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

  async function goToPortal(action: string, plan?: string) {
    const res = await fetch('/api/organization/portal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, plan }),
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
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
                <span className="px-3 py-1 rounded-full text-sm font-bold text-white" style={{ background: planInfo.color }}>
                  {planInfo.label}
                </span>
                <span className="text-sm font-bold text-[#111827]">{planInfo.price}</span>
              </div>
              <p className="text-sm text-gray-500">{planInfo.desc}</p>
              <button onClick={() => setTab('abonnement')}
                className="text-sm font-semibold text-[#2563eb] hover:underline">
                Gérer l'abonnement →
              </button>
            </div>
          </div>
        )}

        {/* ── STRUCTURE */}
        {tab === 'structure' && (
          <div className="max-w-2xl space-y-6">
            {!org ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
                <p className="text-2xl">🏢</p>
                <h3 className="font-bold text-[#111827]">Créer votre structure sportive</h3>
                <p className="text-sm text-gray-500">
                  Une structure regroupe votre club et vos collaborateurs (coachs, bénévoles, staff). Créez-la pour inviter des membres.
                </p>
                <div className="flex gap-3 max-w-sm mx-auto">
                  <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                    placeholder="Nom de votre structure"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                  <button onClick={createOrg} disabled={creating || !orgName}
                    className="bg-[#2563eb] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#1d4ed8] transition disabled:opacity-60">
                    {creating ? '...' : 'Créer'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[#111827] text-lg">{org.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: planInfo.color }}>
                        Plan {planInfo.label}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">{org.members.length} membre{org.members.length > 1 ? 's' : ''}</span>
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
                      {plan === 'STRUCTURE' ? (
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
                          <p className="text-sm text-amber-700">L'invitation de membres nécessite le plan Structure.</p>
                          <button onClick={() => setTab('abonnement')}
                            className="text-sm font-bold text-[#2563eb] hover:underline shrink-0 ml-3">
                            Passer à Structure →
                          </button>
                        </div>
                      )}
                      {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
                      {inviteOk && <p className="text-xs text-green-600 mt-2">✓ Membre ajouté avec succès !</p>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ABONNEMENT */}
        {tab === 'abonnement' && (
          <div className="space-y-6 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'FREE',      price: '0€',     period: '',         features: ['1 compte', '5 visuels/mois', 'Fonctionnalités de base'] },
                { key: 'PRO',       price: '10€',    period: '/mois',    features: ['1 compte', 'Visuels illimités', 'Posts IA illimités', 'Éditeur avancé'] },
                { key: 'STRUCTURE', price: '25€',    period: '/mois',    features: ['Comptes illimités', 'Tout de Pro', 'Gestion d\'équipe', 'Support prioritaire'] },
              ].map(p => {
                const info = PLAN_LABELS[p.key]
                const isCurrent = plan === p.key
                return (
                  <div key={p.key} className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${isCurrent ? 'border-[#2563eb]' : 'border-gray-100'}`}>
                    {isCurrent && <span className="text-xs font-bold text-[#2563eb] mb-2">Plan actuel</span>}
                    <h3 className="font-extrabold text-[#111827] text-lg">{info.label}</h3>
                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-3xl font-black text-[#111827]">{p.price}</span>
                      <span className="text-sm text-gray-400">{p.period}</span>
                    </div>
                    <ul className="space-y-1.5 flex-1 mb-4">
                      {p.features.map(f => (
                        <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-[#22c55e]">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && p.key !== 'FREE' && (
                      <button
                        onClick={() => goToPortal('checkout', p.key)}
                        className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition"
                        style={{ background: info.color }}>
                        Passer à {info.label}
                      </button>
                    )}
                    {isCurrent && plan !== 'FREE' && org?.stripeCustomerId && (
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
