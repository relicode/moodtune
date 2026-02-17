'use client'

import DeleteIcon from '@mui/icons-material/Delete'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { useEffect, useState } from 'react'

import { removeTrackAction } from '$/actions/admin'
import type { Track } from '$/types'

type TrackListProps = {
  branchId: string
  refreshKey: number
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const TrackList = ({ branchId, refreshKey }: TrackListProps) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const confirm = useConfirm()

  const loadTracks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tracks?branchId=${branchId}`)
      const data = await res.json()
      setTracks(data.tracks || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTracks()
  }, [branchId, refreshKey]) // loadTracks is stable via React Compiler

  const handleDelete = async (trackId: string, title: string) => {
    try {
      await confirm({ description: `Remove track "${title}"?` })
      await removeTrackAction(branchId, trackId)
      loadTracks()
    } catch {
      // cancelled
    }
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading tracks...
      </Typography>
    )
  }

  if (tracks.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tracks yet.
      </Typography>
    )
  }

  return (
    <List dense>
      {tracks.map((track) => (
        <ListItem
          key={track.id}
          secondaryAction={
            <IconButton edge="end" size="small" color="error" onClick={() => handleDelete(track.id, track.title)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          }
        >
          <ListItemText
            primary={track.title}
            secondary={`${track.artist || 'Unknown'} • ${formatDuration(track.duration)}`}
          />
        </ListItem>
      ))}
    </List>
  )
}

export default TrackList
