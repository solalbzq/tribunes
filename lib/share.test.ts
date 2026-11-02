import { describe, it, expect } from 'vitest'
import { canShareFiles } from './share'

const file = { name: 'post.png', type: 'image/png' } as unknown as File

describe('canShareFiles', () => {
  it('refuse sans navigateur', () => {
    expect(canShareFiles(undefined, [file])).toBe(false)
    expect(canShareFiles(null, [file])).toBe(false)
  })
  it('refuse sans API share', () => {
    expect(canShareFiles({ canShare: () => true }, [file])).toBe(false)
  })
  it('refuse sans API canShare', () => {
    expect(canShareFiles({ share: async () => {} }, [file])).toBe(false)
  })
  it('refuse si les fichiers ne sont pas supportés', () => {
    expect(canShareFiles({ share: async () => {}, canShare: () => false }, [file])).toBe(false)
  })
  it('refuse si canShare lève une erreur', () => {
    const nav = { share: async () => {}, canShare: () => { throw new Error('x') } }
    expect(canShareFiles(nav, [file])).toBe(false)
  })
  it('accepte quand tout est supporté', () => {
    expect(canShareFiles({ share: async () => {}, canShare: () => true }, [file])).toBe(true)
  })
})
