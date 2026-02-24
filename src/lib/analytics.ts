export type TrackInfo = {
  id: string
  duration: number
  name?: string
  artist?: string
}

export const createTrackReporter =
  (playlistId: string, playlistName: string, username?: string) =>
  (event: string, track: TrackInfo, extra?: Record<string, unknown>) => {
    const data: Record<string, unknown> = {
      playlistId,
      playlistName,
      trackId: track.id,
      trackDuration: track.duration,
      ...(track.name ? { trackName: track.name } : {}),
      ...(track.artist ? { artist: track.artist } : {}),
      ...extra,
    }

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...data }),
    }).catch(() => {})

    if (username) window.umami?.identify({ username })
    window.umami?.track(event, data)
  }
