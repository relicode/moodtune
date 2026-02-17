import { NextResponse } from 'next/server'

import { getBranch } from '$/data/branches'
import { getPlaylistTracks } from '$/data/tracks'
import { getSessionFromCookie } from '$/lib/session'

export const GET = async (_request: Request, { params }: { params: Promise<{ playlistId: string }> }) => {
  const session = await getSessionFromCookie()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playlistId } = await params
  const branch = await getBranch(playlistId)
  if (!branch || branch.type !== 'playlist') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role === 'user' && !session.venueIds.includes(branch.venueId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tracks = await getPlaylistTracks(playlistId)
  const tracksWithUrls = tracks.map((track) => {
    const url = `/api/audio/${playlistId}/${track.id}`
    if (session.role === 'user') {
      return { url, duration: track.duration }
    }
    return {
      url,
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      createdAt: track.createdAt,
    }
  })

  return NextResponse.json({ tracks: tracksWithUrls })
}
