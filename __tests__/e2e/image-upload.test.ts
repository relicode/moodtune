import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

import { API_BASE, fetchApi, fetchApiUnauthed, userCookie } from './helpers'

describe('image upload — POST /api/admin/image', () => {
  it('uploads a valid image and returns imagePath', async () => {
    const imageBuffer = await readFile(resolve(__dirname, '../test-data/test-image.png'))

    const formData = new FormData()
    formData.set('image', new File([imageBuffer], 'photo.png', { type: 'image/png' }))

    const res = await fetchApi('/api/admin/image', { method: 'POST', body: formData })

    expect(res.status).toBe(200)
    const data = (await res.json()) as { imagePath: string }
    expect(data.imagePath).toMatch(/^image\/[0-9a-f-]+\.png$/)
  })

  it('rejects missing image file with 400', async () => {
    const formData = new FormData()

    const res = await fetchApi('/api/admin/image', { method: 'POST', body: formData })

    expect(res.status).toBe(400)
  })

  it('rejects unsupported content type with 415', async () => {
    const formData = new FormData()
    formData.set('image', new File([Buffer.from('not an image')], 'script.js', { type: 'text/javascript' }))

    const res = await fetchApi('/api/admin/image', { method: 'POST', body: formData })

    expect(res.status).toBe(415)
  })

  it('rejects unauthenticated request with 401', async () => {
    const formData = new FormData()
    formData.set('image', new File([Buffer.from('fake')], 'photo.png', { type: 'image/png' }))

    const res = await fetchApiUnauthed('/api/admin/image', { method: 'POST', body: formData })

    expect(res.status).toBe(401)
  })

  it('rejects non-admin user with 401', async () => {
    const cookie = await userCookie()
    const formData = new FormData()
    formData.set('image', new File([Buffer.from('fake')], 'photo.png', { type: 'image/png' }))

    const res = await fetch(`${API_BASE}/api/admin/image`, {
      method: 'POST',
      body: formData,
      headers: { cookie },
    })

    expect(res.status).toBe(401)
  })
})
