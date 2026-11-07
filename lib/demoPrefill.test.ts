import { describe, expect, it } from 'vitest'
import { DEMO_DEFAULT_CLUB, buildSignupHref, parseDemoPrefill } from '@/lib/demoPrefill'

const p = (q: string) => new URLSearchParams(q)

describe('buildSignupHref', () => {
  it('ne transmet rien si rien n’a été modifié', () => {
    expect(buildSignupHref({ club: DEMO_DEFAULT_CLUB, color: '#2563eb', tone: 'enthousiaste' })).toBe('/signup')
  })
  it('transmet les valeurs modifiées', () => {
    const href = buildSignupHref({ club: 'AS Test', color: '#FF0000', tone: 'sobre' })
    expect(parseDemoPrefill(p(href.split('?')[1]))).toEqual({ club: 'AS Test', color: '#ff0000', tone: 'SOBER' })
  })
})

describe('parseDemoPrefill', () => {
  it('renvoie un objet vide sans paramètre', () => {
    expect(parseDemoPrefill(p(''))).toEqual({})
  })
  it('ignore couleur et ton invalides', () => {
    expect(parseDemoPrefill(p('couleur=red&ton=x'))).toEqual({})
  })
  it('limite la longueur du nom et retire les caractères de contrôle', () => {
    expect(parseDemoPrefill(p(`club=${'a'.repeat(200)}`)).club).toHaveLength(60)
    expect(parseDemoPrefill(p('club=A%00B%0AC')).club).toBe('ABC')
  })
})
