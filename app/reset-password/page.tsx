'use client'

import { useEffect, useState } from 'react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Remove auth params from the URL so the token isn't left in history.
    function cleanUrl() {
      window.history.replaceState({}, '', '/reset-password')
    }

    async function init() {
      // Already signed in (e.g. page reloaded after a successful verify).
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        cleanUrl()
        setValidSession(true)
        setChecking(false)
        return
      }

      // Verify the recovery token client-side. Doing it in the browser (not on
      // the server) means email link scanners — which don't run JS — can't
      // consume the single-use token before the user actually opens the link.
      const url = new URL(window.location.href)
      const token_hash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type') as EmailOtpType | null

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash })
        cleanUrl()
        setValidSession(!error)
      } else {
        setValidSession(false)
      }
      setChecking(false)
    }

    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (error.status === 422 || msg.includes('password')) {
        // The session is valid; Supabase rejected the password itself.
        if (msg.includes('different')) {
          setError("Ton nouveau mot de passe doit être différent de l'ancien.")
        } else if (
          msg.includes('weak') || msg.includes('leaked') ||
          msg.includes('pwned') || msg.includes('compromised') || msg.includes('breach')
        ) {
          setError("Ce mot de passe est trop courant ou a fuité dans une base de données connue. Choisis-en un autre, plus original.")
        } else if (msg.includes('least') || msg.includes('length') || msg.includes('short')) {
          setError("Mot de passe trop court : respecte la longueur minimale requise.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré — refais une demande.")
      }
    } else {
      setDone(true)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1800)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex"><Logo size={30} /></Link>
          <p className="mt-3 text-gray-600">Choisis un nouveau mot de passe</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          {checking ? (
            <p className="text-center text-sm text-gray-500">Chargement...</p>
          ) : done ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#111827]">Mot de passe mis à jour !</p>
              <p className="text-xs text-gray-500">Redirection vers ton tableau de bord...</p>
            </div>
          ) : !validSession ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600">
                Ce lien de réinitialisation est invalide ou a expiré.
              </p>
              <Link href="/forgot-password" className="inline-block text-sm text-[#2563eb] font-semibold hover:underline">
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  placeholder="8 caractères minimum"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-1">Confirme le mot de passe</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563eb] text-white font-bold py-3 rounded-xl hover:bg-[#1d4ed8] transition disabled:opacity-60"
              >
                {loading ? 'Mise à jour...' : 'Enregistrer le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
