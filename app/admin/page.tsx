'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AccountDetailPanel from './AccountDetailPanel'
import ConfirmDialog from './ConfirmDialog'

type StatsResponse = {
  // Waitlist
  totalEntries: number
  convertedEntries: number
  todayEntries: number
  weekEntries: number
  conversionRate: number
  entriesByDay: Array<{ date: string; count: number }>
  // Accounts
  totalClubs: number
  totalOrgs: number
  totalMembers: number
  planCounts: Record<string, number>
  // Usage
  totalMatches: number
  totalPosts: number
  postsThisWeek: number
  matchesThisWeek: number
  // AI
  totalCompletions: number
  estimatedCostUsd: number
  // Breakdowns
  sportCounts: Array<{ sport: string; count: number }>
  recentClubs: Array<{ name: string; sport: string; createdAt: string }>
}

type Entry = {
  id: string
  email: string
  clubName: string | null
  sport: string | null
  createdAt: string
  converted: boolean
}

type EntriesResponse = {
  entries: Entry[]
  total: number
  page: number
  totalPages: number
}

type Tab = 'overview' | 'waitlist' | 'usage' | 'ai' | 'accounts'
type AccountsView = 'orgs' | 'clubs' | 'users'

type OrgRow = {
  id: string
  name: string
  plan: string
  suspended: boolean
  createdAt: string
  _count: { members: number; clubs: number }
}

type ClubRow = {
  id: string
  userId: string
  name: string
  sport: string
  suspended: boolean
  createdAt: string
  org: { id: string; name: string } | null
  _count: { matches: number }
}

type UserRow = {
  id: string
  email: string | null
  createdAt: string
  suspended: boolean
  club: { name: string; sport: string } | null
  membership: { role: string; org: { id: string; name: string; plan: string } } | null
}

type PaginatedResponse<TKey extends string, TItem> = {
  total: number
  page: number
  totalPages: number
} & Record<TKey, TItem[]>

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

function fmtDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(
    new Date(`${value}T00:00:00`),
  )
}

function fmtLong(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const SPORT_COLORS: Record<string, string> = {
  Football: '#22c55e',
  Basketball: '#f97316',
  Handball: '#3b82f6',
  Volleyball: '#a855f7',
  Tennis: '#eab308',
}

function sportColor(sport: string) {
  return SPORT_COLORS[sport] ?? '#6b7280'
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  icon: string
}) {
  return (
    <article className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl">{icon}</span>
        <p className={`text-[2rem] font-extrabold leading-none ${accent ? 'text-[#e94560]' : 'text-[#1a1a2e]'}`}>
          {value}
        </p>
      </div>
      <p className="mt-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-[#9ca3af]">{sub}</p>}
    </article>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-bold text-[#1a1a2e]">{children}</h2>
}

function ChartTooltipWaitlist({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold text-[#1a1a2e]">{fmtLong(`${label}T00:00:00`)}</p>
      <p className="text-sm text-[#6b7280]">{payload[0].value} inscrit(s)</p>
    </div>
  )
}

function PlanBadge({ plan, count }: { plan: string; count: number }) {
  const colors: Record<string, string> = {
    FREE: 'bg-[#f3f4f6] text-[#4b5563]',
    PRO: 'bg-[#dbeafe] text-[#1d4ed8]',
    STRUCTURE: 'bg-[#dcfce7] text-[#166534]',
  }
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-white px-4 py-3">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[plan] ?? 'bg-[#f3f4f6] text-[#4b5563]'}`}>
        {plan}
      </span>
      <span className="text-lg font-bold text-[#1a1a2e]">{count}</span>
    </div>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [entriesData, setEntriesData] = useState<EntriesResponse | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Accounts tab
  const [accountsView, setAccountsView] = useState<AccountsView>('orgs')
  const [accountsSearchInput, setAccountsSearchInput] = useState('')
  const [accountsSearch, setAccountsSearch] = useState('')
  const [accountsPage, setAccountsPage] = useState(1)
  const [orgsData, setOrgsData] = useState<PaginatedResponse<'organizations', OrgRow> | null>(null)
  const [clubsData, setClubsData] = useState<PaginatedResponse<'clubs', ClubRow> | null>(null)
  const [usersData, setUsersData] = useState<PaginatedResponse<'users', UserRow> | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [detailPanel, setDetailPanel] = useState<{ type: 'organization' | 'club'; id: string } | null>(null)
  const [userPendingAction, setUserPendingAction] = useState<{ id: string; action: 'suspend' | 'unsuspend' | 'delete' } | null>(null)

  useEffect(() => {
    let mounted = true
    setIsLoadingStats(true)
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) { router.replace('/admin/login'); return }
        const data = await res.json() as StatsResponse
        if (mounted) setStats(data)
      })
      .finally(() => { if (mounted) setIsLoadingStats(false) })
    return () => { mounted = false }
  }, [router])

  useEffect(() => {
    let mounted = true
    setIsLoadingEntries(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    fetch(`/api/admin/entries?${params}`, { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) { router.replace('/admin/login'); return }
        const data = await res.json() as EntriesResponse
        if (mounted) setEntriesData(data)
      })
      .finally(() => { if (mounted) setIsLoadingEntries(false) })
    return () => { mounted = false }
  }, [page, router, search])

  useEffect(() => {
    if (activeTab !== 'accounts') return
    let mounted = true
    setIsLoadingAccounts(true)
    const params = new URLSearchParams({ page: String(accountsPage), limit: '20' })
    if (accountsSearch) params.set('search', accountsSearch)
    const endpoint = accountsView === 'orgs' ? 'organizations' : accountsView === 'clubs' ? 'clubs' : 'users'

    fetch(`/api/admin/${endpoint}?${params}`, { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) { router.replace('/admin/login'); return }
        const data = await res.json()
        if (!mounted) return
        if (accountsView === 'orgs') setOrgsData(data)
        else if (accountsView === 'clubs') setClubsData(data)
        else setUsersData(data)
      })
      .finally(() => { if (mounted) setIsLoadingAccounts(false) })
    return () => { mounted = false }
  }, [activeTab, accountsView, accountsPage, accountsSearch, router])

  function handleAccountsSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAccountsPage(1)
    setAccountsSearch(accountsSearchInput.trim())
  }

  function refetchAccounts() {
    setIsLoadingAccounts(true)
    const params = new URLSearchParams({ page: String(accountsPage), limit: '20' })
    if (accountsSearch) params.set('search', accountsSearch)
    const endpoint = accountsView === 'orgs' ? 'organizations' : accountsView === 'clubs' ? 'clubs' : 'users'
    fetch(`/api/admin/${endpoint}?${params}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (accountsView === 'orgs') setOrgsData(data)
        else if (accountsView === 'clubs') setClubsData(data)
        else setUsersData(data)
      })
      .finally(() => setIsLoadingAccounts(false))
  }

  async function handleUserAction(id: string, action: 'suspend' | 'unsuspend' | 'delete') {
    if (action === 'delete') {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/admin/users/${id}/suspend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: action === 'suspend' }),
      })
    }
    setUserPendingAction(null)
    refetchAccounts()
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    try { await fetch('/api/admin/logout', { method: 'POST' }) }
    finally { router.replace('/admin/login'); router.refresh(); setIsLoggingOut(false) }
  }

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function handleExportCsv() {
    const params = new URLSearchParams({ format: 'csv' })
    if (search) params.set('search', search)
    window.location.href = `/api/admin/entries?${params}`
  }

  const total = entriesData?.total ?? 0
  const startIndex = total === 0 ? 0 : (page - 1) * 20 + 1
  const endIndex = total === 0 ? 0 : Math.min(page * 20, total)

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'overview', label: 'Vue globale', icon: '📊' },
    { id: 'accounts', label: 'Comptes', icon: '🗂️' },
    { id: 'waitlist', label: 'Waitlist', icon: '📋' },
    { id: 'usage', label: 'Usage', icon: '⚙️' },
    { id: 'ai', label: 'IA & Coûts', icon: '🤖' },
  ]

  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#1a1a2e] lg:flex">
      {/* Sidebar */}
      <aside className="bg-[#1a1a2e] px-5 py-6 text-white lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:w-72 lg:flex-col lg:justify-between">
        <div>
          <div>
            <p className="text-2xl font-extrabold">⚡ Tribunes Admin</p>
            <p className="mt-2 text-sm text-white/70">Centre de pilotage.</p>
          </div>

          <div className="my-6 h-px bg-white/15" />

          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-3 text-left font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-white/15 text-white'
                    : 'text-white/65 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="my-6 h-px bg-white/15" />

          {/* Quick numbers in sidebar */}
          {!isLoadingStats && stats && (
            <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Waitlist</span>
                <span className="font-bold">{fmt(stats.totalEntries)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Clubs actifs</span>
                <span className="font-bold">{fmt(stats.totalClubs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Posts générés</span>
                <span className="font-bold">{fmt(stats.totalPosts)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Coût OpenAI</span>
                <span className="font-bold text-[#e94560]">${stats.estimatedCostUsd.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <a href="/" className="rounded-lg px-4 py-3 text-white/75 transition hover:bg-white/5">
            🔗 Voir le site →
          </a>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-lg bg-[#e94560] px-4 py-3 text-left font-semibold text-white transition hover:bg-[#c73652] disabled:opacity-70"
          >
            {isLoggingOut ? 'Déconnexion...' : '🚪 Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <section className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">

        {/* ─── VUE GLOBALE ─── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold text-[#1a1a2e]">Vue globale</h1>

            {/* Top KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon="📋" label="Waitlist totale" value={isLoadingStats ? '...' : fmt(stats?.totalEntries ?? 0)} sub={`+${stats?.todayEntries ?? 0} aujourd'hui`} />
              <StatCard icon="🏟️" label="Clubs créés" value={isLoadingStats ? '...' : fmt(stats?.totalClubs ?? 0)} sub={`${stats?.totalOrgs ?? 0} organisations`} />
              <StatCard icon="⚽" label="Matchs encodés" value={isLoadingStats ? '...' : fmt(stats?.totalMatches ?? 0)} sub={`+${stats?.matchesThisWeek ?? 0} cette semaine`} />
              <StatCard icon="✍️" label="Posts générés" value={isLoadingStats ? '...' : fmt(stats?.totalPosts ?? 0)} accent sub={`+${stats?.postsThisWeek ?? 0} cette semaine`} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon="💳" label="Early adopters payants" value={isLoadingStats ? '...' : fmt(stats?.convertedEntries ?? 0)} accent />
              <StatCard icon="📈" label="Taux de conversion" value={isLoadingStats ? '...' : `${stats?.conversionRate ?? 0}%`} />
              <StatCard icon="👥" label="Membres (orgs)" value={isLoadingStats ? '...' : fmt(stats?.totalMembers ?? 0)} />
              <StatCard icon="🤖" label="Coût OpenAI estimé" value={isLoadingStats ? '...' : `$${stats?.estimatedCostUsd.toFixed(2) ?? '0'}`} sub={`${fmt(stats?.totalCompletions ?? 0)} appels gpt-4o`} accent />
            </div>

            {/* Plans breakdown */}
            {!isLoadingStats && stats && (
              <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <SectionTitle>Répartition des plans</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-3">
                  {['FREE', 'PRO', 'STRUCTURE'].map((plan) => (
                    <PlanBadge key={plan} plan={plan} count={stats.planCounts[plan] ?? 0} />
                  ))}
                </div>
              </div>
            )}

            {/* Sports breakdown */}
            {!isLoadingStats && stats && stats.sportCounts.length > 0 && (
              <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <SectionTitle>Clubs par sport</SectionTitle>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.sportCounts} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="sport" stroke="#6b7280" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} stroke="#6b7280" tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }}
                        formatter={(v) => [v, 'clubs']}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {stats.sportCounts.map((entry) => (
                          <Cell key={entry.sport} fill={sportColor(entry.sport)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent clubs */}
            {!isLoadingStats && stats && stats.recentClubs.length > 0 && (
              <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <SectionTitle>Derniers clubs inscrits</SectionTitle>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="border-b border-[#e5e7eb] px-4 py-3 text-left font-semibold">Nom</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 text-left font-semibold">Sport</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 text-left font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentClubs.map((club, i) => (
                        <tr key={i}>
                          <td className="border-b border-[#f3f4f6] px-4 py-3 font-medium">{club.name}</td>
                          <td className="border-b border-[#f3f4f6] px-4 py-3">
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: sportColor(club.sport) }}>
                              {club.sport}
                            </span>
                          </td>
                          <td className="border-b border-[#f3f4f6] px-4 py-3 text-[#6b7280]">{fmtLong(club.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── WAITLIST ─── */}
        {activeTab === 'waitlist' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold text-[#1a1a2e]">Waitlist</h1>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon="📋" label="Total inscrits" value={isLoadingStats ? '...' : fmt(stats?.totalEntries ?? 0)} />
              <StatCard icon="📅" label="Aujourd'hui" value={isLoadingStats ? '...' : fmt(stats?.todayEntries ?? 0)} />
              <StatCard icon="📆" label="Cette semaine" value={isLoadingStats ? '...' : fmt(stats?.weekEntries ?? 0)} />
              <StatCard icon="💳" label="Early adopters payants" value={isLoadingStats ? '...' : fmt(stats?.convertedEntries ?? 0)} accent sub={`Taux : ${stats?.conversionRate ?? 0}%`} />
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Inscriptions sur 30 jours</h2>
                  <p className="text-sm text-[#6b7280]">{stats?.weekEntries ?? 0} inscriptions sur les 7 derniers jours</p>
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.entriesByDay ?? []}>
                    <defs>
                      <linearGradient id="entriesFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#e94560" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#e94560" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#6b7280" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} stroke="#6b7280" tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipWaitlist />} />
                    <Area type="monotone" dataKey="count" stroke="#e94560" strokeWidth={3} fill="url(#entriesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Entries table */}
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Liste des inscrits</h2>
                  <p className="text-sm text-[#6b7280]">Recherche, pagination et export CSV.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <form className="flex flex-1 gap-3" onSubmit={handleSearchSubmit}>
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Rechercher un email"
                      className="min-w-0 flex-1 rounded-lg border border-[#e5e7eb] px-4 py-2.5 outline-none transition focus:border-[#e94560]"
                    />
                    <button type="submit" className="rounded-lg bg-[#e94560] px-4 py-2.5 font-semibold text-white transition hover:bg-[#c73652]">
                      Rechercher
                    </button>
                  </form>
                  <button type="button" onClick={handleExportCsv} className="rounded-lg border border-[#e94560] px-4 py-2.5 font-semibold text-[#e94560] transition hover:bg-[#e94560] hover:text-white">
                    ↓ CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-[#6b7280]">
                      <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Email</th>
                      <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Club</th>
                      <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Sport</th>
                      <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Date</th>
                      <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingEntries ? (
                      <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={5}>Chargement...</td></tr>
                    ) : entriesData?.entries.length ? (
                      entriesData.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="border-b border-[#f3f4f6] px-4 py-4 font-medium">{entry.email}</td>
                          <td className="border-b border-[#f3f4f6] px-4 py-4">{entry.clubName ?? '—'}</td>
                          <td className="border-b border-[#f3f4f6] px-4 py-4">{entry.sport ?? '—'}</td>
                          <td className="border-b border-[#f3f4f6] px-4 py-4">{fmtLong(entry.createdAt)}</td>
                          <td className="border-b border-[#f3f4f6] px-4 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${entry.converted ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#f3f4f6] text-[#4b5563]'}`}>
                              {entry.converted ? 'Payant' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={5}>Aucun inscrit trouvé.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-sm text-[#6b7280] sm:flex-row sm:items-center sm:justify-between">
                <p>{startIndex}–{endIndex} sur {total}</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 font-semibold text-[#1a1a2e] transition hover:border-[#e94560] disabled:opacity-50">
                    Précédent
                  </button>
                  <button type="button" onClick={() => setPage((p) => Math.min(p + 1, entriesData?.totalPages ?? p))} disabled={page >= (entriesData?.totalPages ?? 1)} className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 font-semibold text-[#1a1a2e] transition hover:border-[#e94560] disabled:opacity-50">
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── USAGE ─── */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold text-[#1a1a2e]">Usage de la plateforme</h1>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon="🏟️" label="Clubs créés" value={isLoadingStats ? '...' : fmt(stats?.totalClubs ?? 0)} />
              <StatCard icon="🏢" label="Organisations" value={isLoadingStats ? '...' : fmt(stats?.totalOrgs ?? 0)} />
              <StatCard icon="👥" label="Membres totaux" value={isLoadingStats ? '...' : fmt(stats?.totalMembers ?? 0)} />
              <StatCard icon="⚽" label="Matchs encodés" value={isLoadingStats ? '...' : fmt(stats?.totalMatches ?? 0)} sub={`+${stats?.matchesThisWeek ?? 0} cette semaine`} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon="✍️" label="Posts générés (total)" value={isLoadingStats ? '...' : fmt(stats?.totalPosts ?? 0)} accent />
              <StatCard icon="📬" label="Posts cette semaine" value={isLoadingStats ? '...' : fmt(stats?.postsThisWeek ?? 0)} />
            </div>

            {/* Plans */}
            {!isLoadingStats && stats && (
              <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <SectionTitle>Organisations par plan</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-3">
                  {['FREE', 'PRO', 'STRUCTURE'].map((plan) => (
                    <PlanBadge key={plan} plan={plan} count={stats.planCounts[plan] ?? 0} />
                  ))}
                </div>
              </div>
            )}

            {/* Sports */}
            {!isLoadingStats && stats && stats.sportCounts.length > 0 && (
              <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <SectionTitle>Répartition par sport</SectionTitle>
                <div className="space-y-3">
                  {stats.sportCounts.map((s) => {
                    const maxCount = Math.max(...stats.sportCounts.map((x) => x.count), 1)
                    const pct = Math.round((s.count / maxCount) * 100)
                    return (
                      <div key={s.sport}>
                        <div className="mb-1 flex justify-between text-sm font-semibold">
                          <span>{s.sport}</span>
                          <span>{s.count} club{s.count > 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#f3f4f6]">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: sportColor(s.sport) }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── IA & COÛTS ─── */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold text-[#1a1a2e]">IA & Coûts OpenAI</h1>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon="🤖" label="Appels gpt-4o" value={isLoadingStats ? '...' : fmt(stats?.totalCompletions ?? 0)} sub="1 appel = 3 posts" />
              <StatCard icon="✍️" label="Posts générés" value={isLoadingStats ? '...' : fmt(stats?.totalPosts ?? 0)} />
              <StatCard icon="💰" label="Coût estimé total" value={isLoadingStats ? '...' : `$${stats?.estimatedCostUsd.toFixed(4) ?? '0'}`} accent />
              <StatCard icon="📊" label="Coût moyen / post" value={isLoadingStats || !stats?.totalPosts ? '...' : `$${((stats.estimatedCostUsd / stats.totalPosts)).toFixed(5)}`} />
            </div>

            {!isLoadingStats && stats && (
              <>
                <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                  <SectionTitle>Détail de l'estimation</SectionTitle>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-[#f8f8f8] px-4 py-3">
                      <span className="text-[#6b7280]">Modèle utilisé</span>
                      <span className="font-mono font-semibold">gpt-4o</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#f8f8f8] px-4 py-3">
                      <span className="text-[#6b7280]">Tokens input estimés / appel</span>
                      <span className="font-semibold">~1 100</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#f8f8f8] px-4 py-3">
                      <span className="text-[#6b7280]">Tokens output estimés / appel</span>
                      <span className="font-semibold">~350</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#f8f8f8] px-4 py-3">
                      <span className="text-[#6b7280]">Prix input (par 1M tokens)</span>
                      <span className="font-semibold">$2.50</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#f8f8f8] px-4 py-3">
                      <span className="text-[#6b7280]">Prix output (par 1M tokens)</span>
                      <span className="font-semibold">$10.00</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#fff0f3] px-4 py-3">
                      <span className="font-bold text-[#e94560]">Total estimé</span>
                      <span className="text-lg font-extrabold text-[#e94560]">${stats.estimatedCostUsd.toFixed(4)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[#9ca3af]">
                    Estimation basée sur le nombre de GeneratedPost en base. Pour le coût exact, consultez votre dashboard OpenAI.
                  </p>
                </div>

                <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                  <SectionTitle>Métriques clés</SectionTitle>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#f8f8f8] p-4 text-center">
                      <p className="text-3xl font-extrabold text-[#1a1a2e]">{stats.totalCompletions}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Appels API total</p>
                    </div>
                    <div className="rounded-xl bg-[#f8f8f8] p-4 text-center">
                      <p className="text-3xl font-extrabold text-[#1a1a2e]">
                        {fmt(stats.totalCompletions * 1100 + stats.totalCompletions * 350)}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Tokens estimés</p>
                    </div>
                    <div className="rounded-xl bg-[#fff0f3] p-4 text-center">
                      <p className="text-3xl font-extrabold text-[#e94560]">${stats.estimatedCostUsd.toFixed(2)}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Coût estimé ($)</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── COMPTES ─── */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold text-[#1a1a2e]">Gestion des comptes</h1>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {([
                  { id: 'orgs', label: 'Organisations' },
                  { id: 'clubs', label: 'Clubs' },
                  { id: 'users', label: 'Users' },
                ] as const).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setAccountsView(v.id); setAccountsPage(1); setAccountsSearchInput(''); setAccountsSearch('') }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      accountsView === v.id ? 'bg-[#1a1a2e] text-white' : 'border border-[#e5e7eb] text-[#1a1a2e] hover:bg-white'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              <form className="flex gap-3" onSubmit={handleAccountsSearchSubmit}>
                <input
                  type="search"
                  value={accountsSearchInput}
                  onChange={(e) => setAccountsSearchInput(e.target.value)}
                  placeholder={accountsView === 'orgs' ? 'Rechercher une organisation' : accountsView === 'clubs' ? 'Rechercher un club' : 'Rechercher un email'}
                  className="min-w-0 flex-1 rounded-lg border border-[#e5e7eb] px-4 py-2.5 text-sm outline-none transition focus:border-[#e94560]"
                />
                <button type="submit" className="rounded-lg bg-[#e94560] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c73652]">
                  Rechercher
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="overflow-x-auto">
                {accountsView === 'orgs' && (
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Nom</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Plan</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Membres</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Clubs</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Statut</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Créée le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingAccounts ? (
                        <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Chargement...</td></tr>
                      ) : orgsData?.organizations.length ? (
                        orgsData.organizations.map((org) => (
                          <tr
                            key={org.id}
                            onClick={() => setDetailPanel({ type: 'organization', id: org.id })}
                            className="cursor-pointer hover:bg-[#f8f8f8]"
                          >
                            <td className="border-b border-[#f3f4f6] px-4 py-3 font-medium">{org.name}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3"><PlanBadgeInline plan={org.plan} /></td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">{org._count.members}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">{org._count.clubs}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">
                              {org.suspended ? (
                                <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-xs font-semibold text-[#991b1b]">Suspendue</span>
                              ) : (
                                <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#166534]">Active</span>
                              )}
                            </td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3 text-[#6b7280]">{fmtLong(org.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Aucune organisation.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {accountsView === 'clubs' && (
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Nom</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Sport</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Organisation</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Matchs</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Statut</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Créé le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingAccounts ? (
                        <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Chargement...</td></tr>
                      ) : clubsData?.clubs.length ? (
                        clubsData.clubs.map((club) => (
                          <tr
                            key={club.id}
                            onClick={() => setDetailPanel({ type: 'club', id: club.id })}
                            className="cursor-pointer hover:bg-[#f8f8f8]"
                          >
                            <td className="border-b border-[#f3f4f6] px-4 py-3 font-medium">{club.name}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">
                              <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: sportColor(club.sport) }}>
                                {club.sport}
                              </span>
                            </td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">{club.org?.name ?? '—'}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">{club._count.matches}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">
                              {club.suspended ? (
                                <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-xs font-semibold text-[#991b1b]">Suspendu</span>
                              ) : (
                                <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#166534]">Actif</span>
                              )}
                            </td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3 text-[#6b7280]">{fmtLong(club.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Aucun club.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {accountsView === 'users' && (
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Email</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Club</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Organisation</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Inscrit le</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Statut</th>
                        <th className="border-b border-[#e5e7eb] px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingAccounts ? (
                        <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Chargement...</td></tr>
                      ) : usersData?.users.length ? (
                        usersData.users.map((u) => (
                          <tr key={u.id}>
                            <td className="border-b border-[#f3f4f6] px-4 py-3 font-medium">{u.email ?? '—'}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">{u.club?.name ?? '—'}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">
                              {u.membership ? `${u.membership.org.name} (${u.membership.role})` : '—'}
                            </td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3 text-[#6b7280]">{fmtLong(u.createdAt)}</td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">
                              {u.suspended ? (
                                <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-xs font-semibold text-[#991b1b]">Suspendu</span>
                              ) : (
                                <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#166534]">Actif</span>
                              )}
                            </td>
                            <td className="border-b border-[#f3f4f6] px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setUserPendingAction({ id: u.id, action: u.suspended ? 'unsuspend' : 'suspend' })}
                                  className="rounded-full border border-[#e5e7eb] px-3 py-1 text-xs font-semibold text-[#1a1a2e] transition hover:bg-[#f8f8f8]"
                                >
                                  {u.suspended ? 'Réactiver' : 'Suspendre'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUserPendingAction({ id: u.id, action: 'delete' })}
                                  className="rounded-full bg-[#e94560]/10 px-3 py-1 text-xs font-semibold text-[#e94560] transition hover:bg-[#e94560]/20"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={6}>Aucun utilisateur.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {(() => {
                const current = accountsView === 'orgs' ? orgsData : accountsView === 'clubs' ? clubsData : usersData
                if (!current) return null
                return (
                  <div className="mt-4 flex flex-col gap-3 text-sm text-[#6b7280] sm:flex-row sm:items-center sm:justify-between">
                    <p>{current.total} résultat(s) — page {current.page}/{current.totalPages}</p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountsPage((p) => Math.max(p - 1, 1))}
                        disabled={accountsPage <= 1}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 font-semibold text-[#1a1a2e] transition hover:border-[#e94560] disabled:opacity-50"
                      >
                        Précédent
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountsPage((p) => Math.min(p + 1, current.totalPages))}
                        disabled={accountsPage >= current.totalPages}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 font-semibold text-[#1a1a2e] transition hover:border-[#e94560] disabled:opacity-50"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </section>

      {detailPanel && (
        <AccountDetailPanel
          type={detailPanel.type}
          id={detailPanel.id}
          onClose={() => setDetailPanel(null)}
          onChanged={refetchAccounts}
        />
      )}

      {userPendingAction && (
        <ConfirmDialog
          title={userPendingAction.action === 'delete' ? 'Supprimer cet utilisateur' : userPendingAction.action === 'suspend' ? 'Suspendre cet utilisateur' : 'Réactiver cet utilisateur'}
          message={
            userPendingAction.action === 'delete'
              ? "Action irréversible : le compte, son club et son appartenance aux organisations seront supprimés."
              : userPendingAction.action === 'suspend'
                ? "L'utilisateur ne pourra plus se connecter tant qu'il n'est pas réactivé."
                : "L'utilisateur pourra de nouveau se connecter."
          }
          confirmLabel={userPendingAction.action === 'delete' ? 'Supprimer' : 'Confirmer'}
          danger={userPendingAction.action !== 'unsuspend'}
          onConfirm={() => handleUserAction(userPendingAction.id, userPendingAction.action)}
          onCancel={() => setUserPendingAction(null)}
        />
      )}
    </main>
  )
}

function PlanBadgeInline({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    FREE: 'bg-[#f3f4f6] text-[#4b5563]',
    PRO: 'bg-[#dbeafe] text-[#1d4ed8]',
    STRUCTURE: 'bg-[#dcfce7] text-[#166534]',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[plan] ?? 'bg-[#f3f4f6] text-[#4b5563]'}`}>
      {plan}
    </span>
  )
}
