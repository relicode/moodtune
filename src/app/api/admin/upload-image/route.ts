import { NextResponse } from 'next/server'

import { IMAGE_BUCKET, uploadFile } from '$/data/minio'
import { getSessionFromCookie } from '$/lib/session'
import { ALLOWED_IMAGE_TYPES, processImage } from '$/lib/sharp'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const POST = async (request: Request) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const imageFile = formData.get('image') as File | null

  if (!imageFile || imageFile.size === 0) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  }

  if (imageFile.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 10 MB limit' }, { status: 413 })
  }

  if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
  }

  const buffer = Buffer.from(await imageFile.arrayBuffer())

  let imageBuffer: Buffer
  try {
    imageBuffer = await processImage(buffer)
  } catch {
    return NextResponse.json({ error: 'Could not process image — unsupported or corrupt file' }, { status: 422 })
  }

  const imagePath = `image/${crypto.randomUUID()}.webp`

  try {
    await uploadFile(IMAGE_BUCKET, imagePath, imageBuffer, 'image/webp')
  } catch {
    return NextResponse.json({ error: 'Failed to store image' }, { status: 500 })
  }

  return NextResponse.json({ success: true, imagePath })
}
