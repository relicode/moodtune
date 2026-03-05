import minioClient, { IMAGE_BUCKET } from '$/data/minio'
import { createLogger } from '$/lib/logger'
import { getSessionFromCookie } from '$/lib/session'
import { toReadableStream } from '$/lib/stream'

const log = createLogger('image-proxy')

export const GET = async (_request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const session = await getSessionFromCookie()
  if (!session) {
    log.warn('unauthorized image proxy request')
    return new Response('Unauthorized', { status: 401 })
  }

  const { path } = await params

  if (path.some((segment) => segment === '..' || segment === '.')) {
    log.warn({ path: path.join('/') }, 'path traversal attempt blocked')
    return new Response('Bad request', { status: 400 })
  }

  const objectName = path.join('/')

  try {
    const stat = await minioClient.statObject(IMAGE_BUCKET, objectName)
    const contentType = stat.metaData?.['content-type'] || 'application/octet-stream'
    const stream = await minioClient.getObject(IMAGE_BUCKET, objectName)

    return new Response(toReadableStream(stream), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=31536000, immutable', // UUID filenames are unique per upload — safe to cache indefinitely
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
