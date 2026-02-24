'use client'

import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import ShuffleOnIcon from '@mui/icons-material/ShuffleOn'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import VolumeDownIcon from '@mui/icons-material/VolumeDown'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import type { StackProps } from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import shuffle from 'lodash-es/shuffle'
import { useConfirm } from 'material-ui-confirm'
import { useEffect, useRef, useState } from 'react'

import { useSnackbar } from '$/hooks/useSnackbar'
import { formatDuration } from '$/lib/utils'
import { PlaylistUiOption } from '$/types'
import type { Playlist, PlaylistTrack } from '$/types'

type AudioPlayerProps<A extends boolean> = {
  playlist: Playlist<A>
  isAdmin: A
}

type AnyTrack = PlaylistTrack<boolean>

const isDetailedTrack = (track: AnyTrack): track is PlaylistTrack<true> => 'name' in track

const generateTracklist = (
  playlist: Playlist<boolean>,
  shouldShuffle: boolean,
  randomProbability: number
): AnyTrack[] => {
  let main: AnyTrack[] = [...playlist.tracks]
  let randomPool: AnyTrack[] = [...playlist.randomTracks]

  if (shouldShuffle) {
    main = shuffle(main)
    randomPool = shuffle(randomPool)
  }

  if (randomPool.length === 0 || randomProbability === 0) return main

  const result: AnyTrack[] = []
  let randomIndex = 0

  for (const track of main) {
    result.push(track)
    if (Math.random() * 100 < randomProbability) {
      result.push(randomPool[randomIndex % randomPool.length])
      randomIndex++
    }
  }

  return result
}

const GridCell = (props: StackProps) => (
  <Grid size={4}>
    <Stack direction="row" alignItems="center" justifyContent="center" sx={{ height: '100%' }} {...props} />
  </Grid>
)

const AudioPlayer = ({ playlist, isAdmin }: AudioPlayerProps<boolean>) => {
  const [adminView, setAdminView] = useState(isAdmin)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [random, setRandom] = useState(playlist.randomTrackProbability)
  const [shouldShuffle, setShouldShuffle] = useState(playlist.ui.includes(PlaylistUiOption.SHUFFLE))
  const [showRefresh, setShowRefresh] = useState(false)
  const [tracks, setTracks] = useState<AnyTrack[]>(playlist.tracks)
  const [volume, setVolume] = useState(100)

  const totalDuration = tracks.reduce((acc, cur) => acc + cur.duration, 0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const confirm = useConfirm()
  const { showSnackbar } = useSnackbar()

  const showTrackList = adminView || playlist.ui.includes(PlaylistUiOption.SHOW_TRACK_NAMES)
  const showShuffleControl = adminView || playlist.ui.includes(PlaylistUiOption.SHOW_CONTROLS_SHUFFLE)
  const showRandomControl = adminView || playlist.ui.includes(PlaylistUiOption.SHOW_CONTROLS_RANDOM)
  const currentTrack = tracks[currentIndex]
  const audioSrc = currentTrack?.url ?? null

  const regenerate = () => {
    setTracks(generateTracklist(playlist, shouldShuffle, random))
    setCurrentIndex(0)
    showSnackbar('Playlist refreshed')
    setShowRefresh(false)
  }

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const tracklist = generateTracklist(playlist, shouldShuffle, random)
      if (!cancelled) setTracks(tracklist)
    }
    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time hydration-safe init; shouldShuffle read but should not re-trigger
  }, [playlist])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)

    const onCanPlay = async () => {
      if (isPlaying) {
        try {
          await audio.play()
        } catch (e) {
          console.warn(`onCanPlayError`, e)
        }
      }
    }

    if (isPlaying) {
      audio.play().catch((e) => {
        console.warn(`Couldn't play, adding event listener`, e)
        audio.addEventListener('canplay', onCanPlay, { once: true })
      })
    } else {
      audio.pause()
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('canplay', onCanPlay)
    }
  }, [audioSrc, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onEnded = () => {
      if (currentIndex < tracks.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        regenerate()
      }
    }

    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate is stable via React Compiler
  }, [currentIndex, tracks])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume / 100
    audio.muted = muted
  }, [volume, muted])

  const VolumeIcon = muted || volume === 0 ? VolumeOffIcon : volume <= 50 ? VolumeDownIcon : VolumeUpIcon

  const loadAndPlay = (index: number) => {
    const audio = audioRef.current
    if (!tracks[index] || !audio) return
    setCurrentIndex(index)
    setIsPlaying(true)
    if (index === currentIndex) {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
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
    <Container
      maxWidth="md"
      disableGutters
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        ...(!showTrackList && { justifyContent: 'center' }),
      }}
    >
      <audio ref={audioRef} src={audioSrc || undefined} hidden />

      {isAdmin && (
        <IconButton
          size="large"
          onClick={() => setAdminView((prev) => !prev)}
          sx={{ position: 'fixed', top: 24, right: 24 }}
          color={adminView ? 'warning' : 'default'}
        >
          <AdminPanelSettingsIcon sx={{ fontSize: 64 }} />
        </IconButton>
      )}

      <Stack spacing={2} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
            <Typography variant="h4">{playlist.name}</Typography>
            {showRefresh && (
              <IconButton
                onClick={async () => {
                  const { confirmed } = await confirm({ description: 'Regenerate list?' })
                  if (confirmed) regenerate()
                }}
                sx={{ position: 'absolute', left: '120%' }}
              >
                <RefreshIcon />
              </IconButton>
            )}
          </Box>
        </Box>
        <Stack spacing={1} alignItems="center">
          {formatDuration(totalDuration, 'long')}

          {showTrackList && currentTrack && isDetailedTrack(currentTrack) && (
            <Typography fontWeight="bold">
              {currentTrack.artist} - {currentTrack.name}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </Typography>
        </Stack>
        <Box
          onClick={(e) => {
            const audio = audioRef.current
            if (!audio || !duration) return
            const rect = e.currentTarget.getBoundingClientRect()
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration
          }}
          sx={{ cursor: 'pointer' }}
        >
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
        </Box>
        <Grid container>
          <GridCell>
            <IconButton onClick={() => setMuted(!muted)} size="small">
              <VolumeIcon fontSize="small" />
            </IconButton>
            <Slider
              value={muted ? 0 : volume}
              onChange={(_, value: number) => {
                setVolume(value)
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
                  [theme.breakpoints.down('sm')]: { display: 'none' },
                },
              })}
            />
          </GridCell>
          <GridCell>
            <IconButton onClick={() => loadAndPlay(currentIndex - 1)} disabled={currentIndex === 0}>
              <SkipPreviousIcon />
            </IconButton>
            <IconButton
              onClick={async () => {
                const audio = audioRef.current
                if (!audio) return
                if (isPlaying) {
                  audio.pause()
                  setIsPlaying(false)
                } else {
                  await audio.play()
                  setIsPlaying(true)
                }
              }}
              size="large"
            >
              {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
            </IconButton>
            <IconButton
              onClick={async () => {
                if (currentIndex < tracks.length - 1) {
                  loadAndPlay(currentIndex + 1)
                } else {
                  const { confirmed } = await confirm({ description: 'Regenerate list?' })
                  if (confirmed) regenerate()
                }
              }}
            >
              <SkipNextIcon />
            </IconButton>
          </GridCell>
          {(showShuffleControl || showRandomControl) && (
            <GridCell>
              {showShuffleControl && (
                <IconButton
                  color={shouldShuffle ? 'primary' : 'default'}
                  onClick={() => {
                    setShouldShuffle((prev) => !prev)
                    setShowRefresh(true)
                  }}
                >
                  <ShuffleOnIcon />
                </IconButton>
              )}
              {showRandomControl && (
                <>
                  <Slider
                    disabled={!shouldShuffle}
                    value={random}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}%`}
                    onChange={(_, value: number) => {
                      setRandom(value)
                      setShowRefresh(true)
                    }}
                    sx={{ ml: 1, mr: 2 }}
                  />
                  <Typography color="text.secondary" textAlign="center">
                    {random}%
                  </Typography>
                </>
              )}
            </GridCell>
          )}
        </Grid>
      </Stack>

      {showTrackList && (
        <List sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {tracks.map((track, index) => (
            <ListItemButton key={track.id + index} selected={index === currentIndex} onClick={() => loadAndPlay(index)}>
              <ListItemText
                primary={isDetailedTrack(track) ? track.name : `Track ${index + 1}`}
                secondary={isDetailedTrack(track) ? track.artist || undefined : undefined}
              />
              <Typography variant="caption" color="text.secondary">
                {formatDuration(track.duration)}
              </Typography>
            </ListItemButton>
          ))}
        </List>
      )}
    </Container>
  )
}

export default AudioPlayer
