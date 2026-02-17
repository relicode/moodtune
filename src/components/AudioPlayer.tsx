'use client'

import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

import type { PlaylistTrack } from '$/types'

type AudioPlayerProps = {
  branchId: string
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const AudioPlayer = ({ branchId }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tracks, setTracks] = useState<PlaylistTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchTracks = async () => {
      setLoading(true)
      setCurrentIndex(0)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)

      try {
        const res = await fetch(`/api/playlist/${branchId}`)
        if (cancelled) return

        if (res.ok) {
          const data = await res.json()
          setTracks(data.tracks)
        } else {
          setTracks([])
        }
      } catch {
        if (!cancelled) setTracks([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTracks()
    return () => {
      cancelled = true
    }
  }, [branchId])

  const currentTrack = tracks[currentIndex]
  const audioSrc = currentTrack?.url ?? null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)

    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
    }
  }, [audioSrc, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onEnded = () => {
      if (currentIndex < tracks.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('ended', onEnded)
    }
  }, [currentIndex, tracks])

  const loadAndPlay = (index: number) => {
    if (!tracks[index]) return
    setCurrentIndex(index)
    setIsPlaying(true)
  }

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      await audio.play()
      setIsPlaying(true)
    }
  }

  const skipPrevious = () => {
    if (currentIndex > 0) loadAndPlay(currentIndex - 1)
  }

  const skipNext = () => {
    if (currentIndex < tracks.length - 1) loadAndPlay(currentIndex + 1)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audio.currentTime = ratio * duration
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (tracks.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        No tracks in this playlist.
      </Typography>
    )
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Box>
      <audio ref={audioRef} src={audioSrc || undefined} />

      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {currentTrack?.title ?? `Track ${currentIndex + 1}`}
        </Typography>
        {currentTrack?.artist && (
          <Typography variant="body2" color="text.secondary">
            {currentTrack.artist}
          </Typography>
        )}

        <Box onClick={handleProgressClick} sx={{ cursor: 'pointer', my: 1 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption">{formatTime(currentTime)}</Typography>
          <Stack direction="row" alignItems="center">
            <IconButton onClick={skipPrevious} disabled={currentIndex === 0}>
              <SkipPreviousIcon />
            </IconButton>
            <IconButton onClick={togglePlay} size="large">
              {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
            </IconButton>
            <IconButton onClick={skipNext} disabled={currentIndex === tracks.length - 1}>
              <SkipNextIcon />
            </IconButton>
          </Stack>
          <Typography variant="caption">{formatTime(duration)}</Typography>
        </Stack>
      </Box>

      <List>
        {tracks.map((track, index) => (
          <ListItemButton key={index} selected={index === currentIndex} onClick={() => loadAndPlay(index)}>
            <ListItemText primary={track.title ?? `Track ${index + 1}`} secondary={track.artist || undefined} />
            <Typography variant="caption" color="text.secondary">
              {formatTime(track.duration)}
            </Typography>
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
}

export default AudioPlayer
