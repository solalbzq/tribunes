'use client'

const OPTIONS = [
  { value: '', label: 'Défaut du club' },
  { value: 'FUN', label: 'Fun' },
  { value: 'SOBER', label: 'Sobre' },
]

/** Override ponctuel de la personnalité du club pour une seule génération. */
export default function ToneSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#111827] mb-1">
        Ton <span className="font-normal text-gray-400">(optionnel — sinon celui de Mon Club)</span>
      </label>
      <div className="flex gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
              value === opt.value ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
