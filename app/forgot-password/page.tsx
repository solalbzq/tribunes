'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError("Une erreur est survenue. Réessaie dans un instant.")
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex"><Logo size={30} /></Link>
          <p className="mt-3 text-gray-600">Réinitialise ton mot de passe</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Si un compte existe pour <span className="font-semibold text-[#111827]">{email}</span>,
                tu vas recevoir un email avec un lien pour choisir un nouveau mot de passe.
              </p>
              <p className="text-xs text-gray-400">
                Pense à vérifier tes spams. Le lien expire au bout d&apos;une heure.
              </p>
              <Link href="/login" className="inline-block text-sm text-[#2563eb] font-semibold hover:underline">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-500">
                Entre ton adresse email : on t&apos;envoie un lien pour définir un nouveau mot de passe.
              </p>
              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  placeholder="ton@email.com"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563eb] text-white font-bold py-3 rounded-xl hover:bg-[#1d4ed8] transition disabled:opacity-60"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <p className="text-center text-sm text-gray-500">
                <Link href="/login" className="text-[#2563eb] font-semibold hover:underline">
                  Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
