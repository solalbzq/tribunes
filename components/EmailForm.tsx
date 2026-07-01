'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

type EmailFormProps = {
  placeholder: string
  buttonLabel: string
  note?: string
  className?: string
}

export function EmailForm({ placeholder, buttonLabel, note, className }: EmailFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [clubName, setClubName] = useState('')
  const [sport, setSport] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, clubName, sport }),
      })

      const payload = (await response.json()) as {
        success: boolean
        message?: string
        alreadyRegistered?: boolean
      }

      if (!response.ok || !payload.success) {
        setStatus('error')
        setMessage(payload.message || 'Une erreur est survenue, reessaie.')
        return
      }

      if (payload.alreadyRegistered) {
        setStatus('success')
        setMessage('Tu es deja sur la liste ✓')
        return
      }

      setStatus('success')
      setMessage(payload.message || 'Inscription confirmee')
      router.push('/merci')
    } catch {
      setStatus('error')
      setMessage('Une erreur est survenue, reessaie.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="grid gap-3 rounded-[12px] border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:grid-cols-3">
        <input
          id="hero-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={placeholder}
          className="sm:col-span-3 rounded-[8px] border border-[#e5e7eb] px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#fff0f3]"
        />
        <input
          name="clubName"
          type="text"
          value={clubName}
          onChange={(event) => setClubName(event.target.value)}
          placeholder="Nom du club (optionnel)"
          className="rounded-[8px] border border-[#e5e7eb] px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#fff0f3]"
        />
        <input
          name="sport"
          type="text"
          value={sport}
          onChange={(event) => setSport(event.target.value)}
          placeholder="Sport (optionnel)"
          className="rounded-[8px] border border-[#e5e7eb] px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#fff0f3]"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-[8px] bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'loading' ? 'Envoi...' : buttonLabel}
        </button>
      </div>
      {note ? <p className="mt-3 text-[13px] text-[#6b7280]">{note}</p> : null}
      {message ? (
        <p className={`mt-3 text-sm ${status === 'error' ? 'text-[#2563eb]' : 'text-[#22c55e]'}`}>
          {message}
        </p>
      ) : null}
    </form>
  )
}
