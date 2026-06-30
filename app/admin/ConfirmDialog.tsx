'use client'

import { useState } from 'react'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  requireText,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  requireText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [input, setInput] = useState('')
  const disabled = Boolean(requireText) && input !== requireText

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-[#1a1a2e]">{title}</h3>
        <p className="mt-2 text-sm text-[#6b7280]">{message}</p>

        {requireText && (
          <div className="mt-4">
            <p className="mb-1 text-xs text-[#9ca3af]">
              Tape <span className="font-mono font-semibold">{requireText}</span> pour confirmer
            </p>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#e94560]"
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition hover:bg-[#f8f8f8]"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              danger ? 'bg-[#e94560] hover:bg-[#c73652]' : 'bg-[#1a1a2e] hover:bg-[#2a2a4e]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
