import { NextResponse } from 'next/server'

import { getBranch } from '$/data/branches'
import { getPlaylistTracks, getRandomTracks } from '$/data/tracks'
import { createLogger } from '$/lib/logger'
import { getSessionFromCookie } from '$/lib/session'
import { BranchType, PlaylistUiOption, UserRole } from '$/types'
import type { Playlist, PlaylistTrack, Track } from '$/types'

const log = createLogger('playlist')

const mapTrack = (playlistId: string, track: Track): PlaylistTrack => ({
  id: track.id,
  url: `/api/audio/${playlistId}/${track.id}`,
  name: track.title,
  artist: track.artist,
  duration: track.duration,
})

const stripTrack = (track: PlaylistTrack): PlaylistTrack<false> => ({
  id: track.id,
  url: track.url,
  duration: track.duration,
})

export const GET = async (_request: Request, { params }: { params: Promise<{ playlistId: string }> }) => {
  const session = await getSessionFromCookie()
  if (!session) {
    log.warn('unauthorized playlist request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playlistId } = await params
  const branch = await getBranch(playlistId)
  if (!branch || branch.type !== BranchType.PLAYLIST) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role === UserRole.USER && !session.venueIds.includes(branch.venueId)) {
    log.warn({ playlistId, userId: session.userId, username: session.username }, 'forbidden playlist access')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [tracks, randomTracks] = await Promise.all([getPlaylistTracks(playlistId), getRandomTracks(playlistId)])

  const showNames = session.role === UserRole.ADMIN || branch.ui.includes(PlaylistUiOption.SHOW_TRACK_NAMES)
  const mapped = tracks.map((t) => mapTrack(playlistId, t))
  const mappedRandom = randomTracks.map((t) => mapTrack(playlistId, t))

  const response: Playlist<boolean> = showNames
    ? {
        id: branch.id,
        name: branch.name,
        tracks: mapped,
        randomTracks: mappedRandom,
        randomTrackProbability: branch.random,
        ui: branch.ui,
      }
    : {
        id: branch.id,
        name: branch.name,
        tracks: mapped.map(stripTrack),
        randomTracks: mappedRandom.map(stripTrack),
        randomTrackProbability: branch.random,
        ui: branch.ui,
      }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' }, // playlist content can change anytime
  })
}
