import { generateIcon } from '$/lib/icon'

type RouteParams = { params: Promise<{ size: string }> }

export const GET = async (_request: Request, { params }: RouteParams) => {
  const { size } = await params
  const n = parseInt(size, 10)
  if (!n || n < 16 || n > 1024) return new Response('Invalid size', { status: 400 })
  return generateIcon(n)
}
