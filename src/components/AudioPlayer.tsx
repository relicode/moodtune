'use client'

import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

import { getTrackUrl } from '$/actions/media'
import type { Track } from '$/types'

type AudioPlayerProps = {
  tracks: Track[]
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const AudioPlayer = ({ tracks }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)

  const currentTrack = tracks[currentIndex]

  useEffect(() => {
    let cancelled = false
    const loadInitial = async () => {
      if (tracks.length === 0) return
      const url = await getTrackUrl(tracks[0].fileName)
      if (!cancelled && url) {
        setAudioSrc(url)
        setCurrentIndex(0)
      }
    }
    loadInitial()
    return () => {
      cancelled = true
    }
  }, [tracks])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)

    if (isPlaying) {
      audio.play()
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
    }
  }, [audioSrc, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onEnded = async () => {
      if (currentIndex < tracks.length - 1) {
        const nextTrack = tracks[currentIndex + 1]
        const url = await getTrackUrl(nextTrack.fileName)
        if (url) {
          setAudioSrc(url)
          setCurrentIndex(currentIndex + 1)
        }
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('ended', onEnded)
    }
  }, [currentIndex, tracks])

  const loadAndPlay = async (index: number) => {
    const track = tracks[index]
    if (!track) return
    const url = await getTrackUrl(track.fileName)
    if (url) {
      setAudioSrc(url)
      setCurrentIndex(index)
      setIsPlaying(true)
    }
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
          {currentTrack?.title || 'No track selected'}
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
          <ListItemButton key={track.id} selected={index === currentIndex} onClick={() => loadAndPlay(index)}>
            <ListItemText primary={track.title} secondary={track.artist || undefined} />
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
