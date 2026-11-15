import { describe, expect, it } from 'vitest'
import { INSTALL_BANNER_STORAGE_KEY, isDismissed, isIosSafari, rememberDismissal } from './installBanner'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'

describe('isIosSafari', () => {
  it('reconnaît Safari sur iPhone', () => expect(isIosSafari(IPHONE_SAFARI)).toBe(true))
  it('exclut Chrome sur iPhone', () => expect(isIosSafari(IPHONE_CHROME)).toBe(false))
  it('exclut Android', () => expect(isIosSafari(ANDROID_CHROME)).toBe(false))
})

describe('fermeture mémorisée', () => {
  it('ne revient pas après fermeture', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
    expect(isDismissed(storage)).toBe(false)
    rememberDismissal(storage)
    expect(data.get(INSTALL_BANNER_STORAGE_KEY)).toBe('1')
    expect(isDismissed(storage)).toBe(true)
  })
  it('ne plante pas si le stockage est bloqué', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(isDismissed(blocked)).toBe(false)
    expect(() => rememberDismissal(blocked)).not.toThrow()
  })
})
