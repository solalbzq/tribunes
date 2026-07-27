'use client'

import { useRef, useState } from 'react'
import TextPostsPanel from './TextPostsPanel'
import ToneSelector from './ToneSelector'
import EngagementPollVisualGenerator from './EngagementPollVisualGenerator'
import { FIELD } from './ui'
import { Icon } from './icons'

type Posts = { instagram: string; facebook: string; whatsapp: string }
type PostIds = Partial<Record<keyof Posts, string>>

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

export default function EngagementPollTab({ club }: { club: Club }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [tone, setTone] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Posts | null>(null)
  const [postIds, setPostIds] = useState<PostIds | null>(null)
  const [pollId, setPollId] = useState<string | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  function updateOption(i: number, value: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? value : o))
  }

  function addOption() {
    if (options.length >= 4) return
    setOptions(prev => [...prev, ''])
  }

  function removeOption(i: number) {
    if (options.length <= 2) return
    setOptions(prev => prev.filter((_, idx) => idx !== i))
  }

  const filledOptions = options.filter(o => o.trim())
  const canGenerate = Boolean(question && filledOptions.length >= 2)

  async function generateCaptions() {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/posts/engagement-poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          options: filledOptions,
          tone: tone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec de la génération')
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setPollId(data.pollId ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function personalize(overrides: { tone?: string; customInstructions?: string }) {
    if (!pollId) return
    setPersonalizing(true)
    try {
      const res = await fetch('/api/posts/engagement-poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question, options: filledOptions,
          id: pollId, regenerate: true,
          tone: overrides.tone, customInstructions: overrides.customInstructions,
        }),
      })
      const data = await res.json()
      if (!res.ok) return
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
    } finally {
      setPersonalizing(false)
    }
  }

  if (posts) {
    return (
      <TextPostsPanel
        posts={posts}
        postIds={postIds}
        title="Vos légendes sont prêtes"
        onReset={() => { setPosts(null); setPostIds(null); setPollId(null) }}
        getImageBlob={getImageBlob}
        onPersonalize={personalize}
        personalizing={personalizing}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Question</label>
          <input value={question} onChange={e => setQuestion(e.target.value)} className={FIELD} placeholder="Ex: Quel a été votre meilleur moment de la saison ?" />
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#111827] text-sm">Options de réponse</h3>
          <span className="text-xs text-gray-400">{options.length}/4</span>
        </div>

        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5">{String.fromCharCode(65 + i)}</span>
              <input
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                className={FIELD}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} className="text-xs text-red-400 hover:text-red-600 transition shrink-0">
                  Supprimer
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 4 && (
          <button
            onClick={addOption}
            className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition"
          >
            + Ajouter une option
          </button>
        )}

        <ToneSelector value={tone} onChange={setTone} />

        <button
          onClick={generateCaptions}
          disabled={generating || !canGenerate}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4fd8] transition disabled:opacity-60"
        >
          {generating
            ? <><Icon name="refresh" className="h-[18px] w-[18px] animate-spin" /> Génération…</>
            : <><Icon name="sparkles" className="h-[18px] w-[18px]" /> Générer les légendes IA</>}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div>
        <EngagementPollVisualGenerator
          club={club}
          question={question}
          options={filledOptions}
          onCanvasReady={c => { canvasRef.current = c }}
        />
      </div>
    </div>
  )
}
