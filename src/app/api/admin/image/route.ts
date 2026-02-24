import { unlink } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

import { IMAGE_BUCKET, uploadFileFromPath } from '$/data/minio'
import { sanitizeExtension } from '$/lib/filename'
import { TEMP_DIR } from '$/lib/paths'
import { getSessionFromCookie } from '$/lib/session'
import { streamToFile } from '$/lib/stream'
import { UserRole } from '$/types'

const MAX_FILE_SIZE = 20_971_520 // 20 MB

const SUFFIX_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jpe': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.svgz': 'image/svg+xml',
  '.avif': 'image/avif',
}

// SVG can contain embedded scripts — exclude to prevent XSS
const UNSAFE_FORMATS = new Set(['svg'])

const ALLOWED_TYPES = new Set(
  Object.entries(sharp.format)
    .filter(([key, v]) => v.input?.file && !UNSAFE_FORMATS.has(key))
    .flatMap(([, v]) => (v.input?.fileSuffix ?? []).map((s: string) => SUFFIX_TO_MIME[s]).filter(Boolean))
)

export const POST = async (request: Request) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const imageFile = formData.get('image') as File | null

  if (!imageFile || imageFile.size === 0) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(imageFile.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
  }

  if (imageFile.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 20 MB limit' }, { status: 413 })
  }

  const ext = sanitizeExtension(imageFile.name)
  const objectName = `image/${crypto.randomUUID()}.${ext}`
  const tmpFile = join(TEMP_DIR, `moodtune-${crypto.randomUUID()}`)

  try {
    await streamToFile(imageFile.stream(), tmpFile)
    await uploadFileFromPath(IMAGE_BUCKET, objectName, tmpFile, imageFile.type)
    return NextResponse.json({ imagePath: objectName })
  } catch {
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  } finally {
    await unlink(tmpFile).catch(() => {})
  }
}
