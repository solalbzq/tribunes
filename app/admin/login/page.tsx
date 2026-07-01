'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        setError('Mot de passe incorrect')
        return
      }

      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2"><Logo size={26} /><span className="text-sm font-bold text-gray-400">Admin</span></span>
          <p className="mt-2 text-sm text-[#6b7280]">Acces prive au tableau de bord.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111827]" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-4 py-3 outline-none transition focus:border-[#2563eb]"
              placeholder="Votre mot de passe admin"
              required
            />
          </div>

          {error ? <p className="text-sm font-medium text-[#dc2626]">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#2563eb] px-4 py-3 font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Verification...' : 'Acceder'}
          </button>
        </form>
      </div>
    </main>
  )
}
