import { describe, it, expect } from 'vitest'
import { parseReferenceAnalysis, parseCharterAnalysis } from './brandAssetAnalysisSchema'

describe('parseReferenceAnalysis', () => {
  it('accepts a well-formed response', () => {
    const result = parseReferenceAnalysis({
      colors: ['#111827', '#2563eb'],
      contrast: 'high',
      density: 'medium',
      photoImportance: 'low',
      textQuantity: 'medium',
      mood: 'énergique et moderne',
      logoPlacement: 'en haut à droite',
      recommendedTemplate: 'clubAnnouncement',
    })
    expect(result).toEqual({
      colors: ['#111827', '#2563eb'],
      contrast: 'high',
      density: 'medium',
      photoImportance: 'low',
      textQuantity: 'medium',
      mood: 'énergique et moderne',
      logoPlacement: 'en haut à droite',
      recommendedTemplate: 'clubAnnouncement',
    })
  })

  it('never trusts the model output blindly — rejects invalid enum/color/template values', () => {
    const result = parseReferenceAnalysis({
      colors: ['not-a-color', '#fff', '#123456', 'javascript:alert(1)'],
      contrast: 'extreme', // pas dans l'énumération
      recommendedTemplate: 'DROP TABLE club_brand_asset', // tentative d'injection dans un champ censé être une enum fermée
      mood: 'a'.repeat(1000), // doit être tronqué
    })
    expect(result.colors).toEqual(['#123456'])
    expect(result.contrast).toBeNull()
    expect(result.recommendedTemplate).toBeNull()
    expect(result.mood?.length).toBeLessThanOrEqual(80)
  })

  it('handles a completely malformed/empty response without throwing', () => {
    expect(() => parseReferenceAnalysis(null)).not.toThrow()
    expect(() => parseReferenceAnalysis('not an object')).not.toThrow()
    expect(() => parseReferenceAnalysis(undefined)).not.toThrow()
    const result = parseReferenceAnalysis({})
    expect(result.colors).toEqual([])
    expect(result.recommendedTemplate).toBeNull()
  })

  it('caps colors at 5 even if the model returns more', () => {
    const many = Array.from({ length: 10 }, (_, i) => `#${(i).toString(16).padStart(6, '0')}`)
    expect(parseReferenceAnalysis({ colors: many }).colors).toHaveLength(5)
  })
})

describe('parseCharterAnalysis', () => {
  it('accepts a well-formed image-based response', () => {
    const result = parseCharterAnalysis({ colors: ['#111827'], toneIndications: 'sobre', logoDetected: true, typography: 'Inter' }, 'image')
    expect(result).toEqual({ colors: ['#111827'], toneIndications: 'sobre', logoDetected: true, typography: 'Inter', source: 'image' })
  })

  it('never returns colors or a detected logo for a PDF text-only analysis, even if the model hallucinates them', () => {
    const result = parseCharterAnalysis({ colors: ['#111827'], logoDetected: true, toneIndications: 'officiel' }, 'pdf-text-only')
    expect(result.colors).toEqual([])
    expect(result.logoDetected).toBe(false)
    expect(result.toneIndications).toBe('officiel')
    expect(result.source).toBe('pdf-text-only')
  })
})
