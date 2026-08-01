import { describe, it, expect } from 'vitest'
import { validateImageUpload, MAX_IMAGE_SIZE } from './uploads'

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const WEBP_BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
const TEXT_BYTES = new TextEncoder().encode('<script>alert(1)</script>')

function fileOf(bytes: Uint8Array, type: string, name = 'file'): File {
  return new File([bytes as unknown as BlobPart], name, { type })
}

describe('validateImageUpload', () => {
  it('accepts a valid PNG whose declared type matches its real content', async () => {
    const result = await validateImageUpload(fileOf(PNG_BYTES, 'image/png'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.ext).toBe('png')
  })

  it('accepts a valid JPEG', async () => {
    const result = await validateImageUpload(fileOf(JPEG_BYTES, 'image/jpeg'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.ext).toBe('jpg')
  })

  it('accepts a valid WEBP', async () => {
    const result = await validateImageUpload(fileOf(WEBP_BYTES, 'image/webp'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.ext).toBe('webp')
  })

  it('rejects a missing file', async () => {
    const result = await validateImageUpload(null)
    expect(result.ok).toBe(false)
  })

  it('rejects a disallowed declared MIME type (e.g. SVG, which can carry scripts)', async () => {
    const result = await validateImageUpload(fileOf(TEXT_BYTES, 'image/svg+xml'))
    expect(result.ok).toBe(false)
  })

  it('rejects a file whose real content does not match its declared type (spoofed Content-Type)', async () => {
    const result = await validateImageUpload(fileOf(TEXT_BYTES, 'image/png', 'fake.png'))
    expect(result.ok).toBe(false)
  })

  it('rejects a file larger than the size limit', async () => {
    const big = new Uint8Array(MAX_IMAGE_SIZE + 1)
    big.set(PNG_BYTES)
    const result = await validateImageUpload(fileOf(big, 'image/png'))
    expect(result.ok).toBe(false)
  })
})
