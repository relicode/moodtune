'use client'

import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import VolumeDownIcon from '@mui/icons-material/VolumeDown'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import Slider from '@mui/material/Slider'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

import type { PlaylistTrack, UserRole } from '$/types'

type AudioPlayerProps = {
  branchId: string
  role: UserRole
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const AudioPlayer = ({ branchId, role }: AudioPlayerProps) => {
  const isAdmin = role === 'admin'
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tracks, setTracks] = useState<PlaylistTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)

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

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume / 100
    audio.muted = muted
  }, [volume, muted])

  const toggleMute = () => {
    setMuted(!muted)
  }

  const VolumeIcon = muted || volume === 0 ? VolumeOffIcon : volume <= 50 ? VolumeDownIcon : VolumeUpIcon

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
        {isAdmin && (
          <>
            <Typography variant="subtitle1" fontWeight="bold">
              {currentTrack?.title ?? `Track ${currentIndex + 1}`}
            </Typography>
            {currentTrack?.artist && (
              <Typography variant="body2" color="text.secondary">
                {currentTrack.artist}
              </Typography>
            )}
          </>
        )}

        <Box onClick={handleProgressClick} sx={{ cursor: 'pointer', my: 1 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
        </Box>

        <Stack direction="row" alignItems="center" spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
            <IconButton onClick={toggleMute} size="small">
              <VolumeIcon fontSize="small" />
            </IconButton>
            <Slider
              value={muted ? 0 : volume}
              onChange={(_, value) => {
                setVolume(value as number)
                if (muted) setMuted(false)
              }}
              min={0}
              max={100}
              step={1}
              marks={[
                { value: 0, label: '0%' },
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
                { value: 75, label: '75%' },
                { value: 100, label: '100%' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}%`}
              size="small"
              aria-label="Volume"
              sx={(theme) => ({
                mb: 0,
                '& .MuiSlider-markLabel': {
                  fontSize: '0.625rem',
                  [theme.breakpoints.down('md')]: { display: 'none' },
                },
              })}
            />
          </Stack>
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
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="caption">
              {formatTime(currentTime)} / {formatTime(duration)}
            </Typography>
            <AccessTimeIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
          </Stack>
        </Stack>
      </Box>

      {isAdmin && (
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
      )}
    </Box>
  )
}

export default AudioPlayer
