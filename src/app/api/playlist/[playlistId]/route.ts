import { NextResponse } from 'next/server'

import { getBranch } from '$/data/branches'
import { getPlaylistTracks, getRandomTracks } from '$/data/tracks'
import { getSessionFromCookie } from '$/lib/session'
import type { PlaylistResponse, PlaylistTrack, Track } from '$/types'

const mapTrack = (playlistId: string, track: Track): PlaylistTrack => ({
  url: `/api/audio/${playlistId}/${track.id}`,
  name: track.title,
  artist: track.artist,
  duration: track.duration,
})

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

  const [tracks, randomTracks] = await Promise.all([getPlaylistTracks(playlistId), getRandomTracks(playlistId)])

  const response: PlaylistResponse = {
    id: branch.id,
    name: branch.name,
    tracks: tracks.map((t) => mapTrack(playlistId, t)),
    randomTracks: randomTracks.map((t) => mapTrack(playlistId, t)),
    randomTrackProbability: branch.random,
    shuffle: branch.shuffle,
    shuffleVisibleToUser: branch.shuffleVisibleToUser,
    ui: branch.ui,
  }

  return NextResponse.json(response)
}
