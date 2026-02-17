import sharp from 'sharp'

const MIME_BY_FORMAT: Record<string, string[]> = {
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  tiff: ['image/tiff'],
  svg: ['image/svg+xml'],
  heif: ['image/heif', 'image/avif'],
}

export const ALLOWED_IMAGE_TYPES = new Set(
  Object.entries(sharp.format)
    .filter(([, fmt]) => fmt.input?.file)
    .flatMap(([id]) => MIME_BY_FORMAT[id] ?? [])
)

export const processImage = async (buffer: Buffer): Promise<Buffer> =>
  sharp(buffer).resize(512, 512, { fit: 'cover' }).webp().toBuffer()
