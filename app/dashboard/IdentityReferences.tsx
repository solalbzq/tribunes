'use client'

import { useEffect, useRef, useState } from 'react'
import { PageHeader, Field, INPUT } from './ui'
import { Icon } from './icons'
import { MAX_REFERENCES } from '@/lib/services/brandAssetValidation'
import type { ReferenceAnalysis, CharterAnalysis } from '@/lib/services/brandAssetAnalysisSchema'

type Asset = {
  id: string
  kind: 'REFERENCE' | 'CHARTER'
  sourceNote: string | null
  status: 'PENDING' | 'ANALYZED' | 'FAILED'
  analysis: ReferenceAnalysis | CharterAnalysis | null
  mimeType: string
  fileSize: number
  createdAt: string
  url: string | null
}

const LEVEL_LABELS: Record<string, string> = { low: 'Faible', medium: 'Moyen', high: 'Élevé' }

function AssetCard({ asset, onChanged, onApplied }: { asset: Asset; onChanged: () => void; onApplied: () => void }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptColors, setAcceptColors] = useState(true)
  const [acceptText, setAcceptText] = useState(true)
  const [editedInstruction, setEditedInstruction] = useState('')

  const ref = asset.kind === 'REFERENCE' ? (asset.analysis as ReferenceAnalysis | null) : null
  const charter = asset.kind === 'CHARTER' ? (asset.analysis as CharterAnalysis | null) : null

  useEffect(() => {
    if (ref) {
      const parts = [ref.mood, ref.logoPlacement ? `Logo ${ref.logoPlacement}` : null].filter(Boolean)
      setEditedInstruction(parts.join(' — '))
    } else if (charter?.toneIndications) {
      setEditedInstruction(charter.toneIndications)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, asset.status])

  async function analyze() {
    setAnalyzing(true); setError(null)
    try {
      const res = await fetch(`/api/clubs/brand-assets/${asset.id}/analyze`, { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? "Échec de l'analyse"); return }
      onChanged()
    } finally {
      setAnalyzing(false)
    }
  }

  async function remove() {
    await fetch(`/api/clubs/brand-assets/${asset.id}`, { method: 'DELETE' })
    onChanged()
  }

  async function apply() {
    setApplying(true); setError(null)
    try {
      const colors = ref?.colors ?? charter?.colors ?? []
      const body: Record<string, unknown> = {}
      if (acceptColors && colors.length > 0) {
        body.primaryColor = colors[0]
        if (colors[1]) body.secondaryColor = colors[1]
      }
      if (acceptText && editedInstruction.trim()) body.instructionsSentence = editedInstruction.trim()
      const res = await fetch(`/api/clubs/brand-assets/${asset.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? "Échec de l'application"); return }
      onApplied()
    } finally {
      setApplying(false)
    }
  }

  const detectedColors = ref?.colors ?? charter?.colors ?? []

  return (
    <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl border border-line overflow-hidden flex items-center justify-center bg-subtle shrink-0">
          {asset.mimeType === 'application/pdf' ? (
            <Icon name="fileText" className="h-6 w-6 text-muted" />
          ) : asset.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon name="image" className="h-6 w-6 text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              asset.status === 'ANALYZED' ? 'bg-green-50 text-green-700' : asset.status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-subtle text-muted'
            }`}>
              {asset.status === 'ANALYZED' ? 'Analysé' : asset.status === 'FAILED' ? 'Échec' : 'En attente'}
            </span>
            {asset.sourceNote && (
              <span className="text-xs text-muted">{asset.sourceNote === 'own' ? 'Publication du club' : 'Inspiration externe'}</span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">{(asset.fileSize / 1024).toFixed(0)} Ko</p>
        </div>
        <button onClick={remove} className="text-xs text-red-400 hover:text-red-600 transition shrink-0">Supprimer</button>
      </div>

      {asset.status !== 'ANALYZED' && (
        <button
          onClick={analyze}
          disabled={analyzing}
          className="w-full py-2 rounded-xl bg-subtle text-ink text-sm font-semibold hover:bg-line transition disabled:opacity-60"
        >
          {analyzing ? 'Analyse en cours...' : asset.status === 'FAILED' ? "Réessayer l'analyse" : 'Analyser'}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {asset.status === 'ANALYZED' && (ref || charter) && (
        <div className="space-y-3 border-t border-line pt-3">
          {detectedColors.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={acceptColors} onChange={e => setAcceptColors(e.target.checked)} />
              <span className="flex items-center gap-1.5">
                Couleurs détectées :
                {detectedColors.map(c => <span key={c} className="w-4 h-4 rounded-full border border-line" style={{ background: c }} />)}
              </span>
            </label>
          )}
          {ref && (
            <p className="text-xs text-muted">
              {[
                ref.contrast && `Contraste ${LEVEL_LABELS[ref.contrast]}`,
                ref.density && `Densité ${LEVEL_LABELS[ref.density]}`,
                ref.photoImportance && `Importance photo ${LEVEL_LABELS[ref.photoImportance]}`,
                ref.recommendedTemplate && `Template proche : ${ref.recommendedTemplate}`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
          {charter?.typography && <p className="text-xs text-muted">Typographie évoquée : {charter.typography} (équivalent proposé, jamais garanti identique)</p>}
          {(ref?.mood || charter?.toneIndications) && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={acceptText} onChange={e => setAcceptText(e.target.checked)} className="mt-1" />
              <span className="flex-1">
                Consigne à ajouter (modifiable) :
                <input value={editedInstruction} onChange={e => setEditedInstruction(e.target.value)} className={`${INPUT} mt-1`} maxLength={200} />
              </span>
            </label>
          )}
          <button
            onClick={apply}
            disabled={applying || (!acceptColors && !acceptText)}
            className="w-full py-2 rounded-xl bg-[#111827] text-white text-sm font-semibold hover:bg-[#1f2937] transition disabled:opacity-60"
          >
            {applying ? 'Application...' : 'Appliquer la sélection'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function IdentityReferences({ onApplied }: { onApplied: () => void }) {
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [referenceSourceNote, setReferenceSourceNote] = useState<'own' | 'inspiration'>('own')
  const referenceFileRef = useRef<HTMLInputElement>(null)
  const charterFileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch('/api/clubs/brand-assets')
    if (!res.ok) return
    const data = await res.json()
    setAssets(data.assets ?? [])
  }

  useEffect(() => { load() }, [])

  async function upload(kind: 'REFERENCE' | 'CHARTER', file: File) {
    setUploading(true); setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('kind', kind)
      fd.append('file', file)
      if (kind === 'REFERENCE') fd.append('sourceNote', referenceSourceNote)
      const res = await fetch('/api/clubs/brand-assets', { method: 'POST', body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setUploadError(data?.error ?? "Échec de l'envoi"); return }
      await load()
    } finally {
      setUploading(false)
    }
  }

  const references = (assets ?? []).filter(a => a.kind === 'REFERENCE')
  const charter = (assets ?? []).find(a => a.kind === 'CHARTER')

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        icon="sparkles"
        title="Références et charte graphique"
        subtitle="Facultatif — pour aller plus loin que la configuration manuelle."
      />

      <div className="rounded-2xl bg-brand-soft/40 border border-brand/20 p-4">
        <p className="text-sm text-ink">Tribunes s&apos;inspire de vos références pour proposer une identité compatible avec ses templates — jamais une reproduction exacte.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink">Publications de référence</h3>
          <span className="text-xs text-muted">{references.length}/{MAX_REFERENCES}</span>
        </div>
        <Field label="Ces publications viennent...">
          <div className="flex gap-2">
            <button type="button" onClick={() => setReferenceSourceNote('own')} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${referenceSourceNote === 'own' ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200'}`}>
              De notre club
            </button>
            <button type="button" onClick={() => setReferenceSourceNote('inspiration')} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${referenceSourceNote === 'inspiration' ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200'}`}>
              Inspiration externe
            </button>
          </div>
        </Field>
        {references.length < MAX_REFERENCES && (
          <>
            <input ref={referenceFileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload('REFERENCE', f) }} />
            <button onClick={() => referenceFileRef.current?.click()} disabled={uploading}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition disabled:opacity-60">
              {uploading ? 'Envoi...' : '+ Ajouter une référence'}
            </button>
          </>
        )}
        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {references.map(a => <AssetCard key={a.id} asset={a} onChanged={load} onApplied={onApplied} />)}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-ink">Charte graphique</h3>
        <p className="text-xs text-muted">Image (analyse complète) ou PDF (contenu textuel uniquement — pour les couleurs et le logo, préférez une image).</p>
        {!charter && (
          <>
            <input ref={charterFileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload('CHARTER', f) }} />
            <button onClick={() => charterFileRef.current?.click()} disabled={uploading}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition disabled:opacity-60">
              {uploading ? 'Envoi...' : '+ Importer une charte'}
            </button>
          </>
        )}
        {charter && <div className="max-w-sm"><AssetCard asset={charter} onChanged={load} onApplied={onApplied} /></div>}
      </div>
    </div>
  )
}
