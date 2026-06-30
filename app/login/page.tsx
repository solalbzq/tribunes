'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-extrabold text-[#1a1a2e]">⚡ Tribunes</Link>
          <p className="mt-2 text-gray-600">Connecte-toi à ton compte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#1a1a2e] transition hover:bg-gray-50 disabled:opacity-60"
            >
              <GoogleIcon />
              {oauthLoading === 'google' ? '...' : 'Google'}
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
            >
              <AppleIcon />
              {oauthLoading === 'apple' ? '...' : 'Apple'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]/30"
                placeholder="ton@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]/30"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e94560] text-white font-bold py-3 rounded-xl hover:bg-[#d63a52] transition disabled:opacity-60"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link href="/signup" className="text-[#e94560] font-semibold hover:underline">
                Créer un compte
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.608 14.177 17.64 11.9 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M14.25 9.56c-.024-2.55 2.083-3.787 2.178-3.847-1.186-1.732-3.03-1.97-3.688-1.993-1.571-.16-3.069.93-3.866.93-.796 0-2.027-.91-3.333-.884-1.716.026-3.301 1.004-4.183 2.545-1.79 3.097-.457 7.68 1.286 10.196.855 1.228 1.872 2.605 3.207 2.555 1.29-.05 1.777-.828 3.338-.828 1.56 0 2.006.828 3.371.8 1.385-.022 2.26-1.247 3.102-2.48.988-1.42 1.392-2.81 1.41-2.882-.032-.013-2.696-1.032-2.722-4.112z"/>
      <path d="M11.714 2.68C12.404 1.84 12.87.7 12.74-.44c-.966.04-2.137.645-2.848 1.474-.626.728-1.173 1.89-1.025 3.004 1.079.084 2.177-.548 2.847-1.358z"/>
    </svg>
  )
}
