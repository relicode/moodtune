'use client'

import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { useEffect, useState } from 'react'

import { removeTrackAction } from '$/actions/admin'
import type { Track } from '$/types'
import TrackEditForm from './TrackEditForm'

type TrackListProps = {
  branchId: string
  refreshKey: number
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

type TrackItemProps = {
  branchId: string
  track: Track
  onChanged: () => void
}

const TrackItem = ({ branchId, track, onChanged }: TrackItemProps) => {
  const [editOpen, setEditOpen] = useState(false)
  const confirm = useConfirm()

  const handleDelete = async () => {
    const { confirmed } = await confirm({ description: `Remove track "${track.title}"?` })
    if (!confirmed) return
    await removeTrackAction(branchId, track.id)
    onChanged()
  }

  return (
    <>
      <ListItem
        secondaryAction={
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit track">
              <IconButton size="small" color="info" onClick={() => setEditOpen(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete track">
              <IconButton edge="end" size="small" color="error" onClick={handleDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      >
        <ListItemText
          primary={track.title}
          secondary={`${track.artist || 'Unknown'} • ${formatDuration(track.duration)}`}
        />
      </ListItem>
      <TrackEditForm track={track} open={editOpen} onClose={() => setEditOpen(false)} onUpdated={onChanged} />
    </>
  )
}

const TrackList = ({ branchId, refreshKey }: TrackListProps) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  const loadTracks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tracks/${branchId}`)
      const data = await res.json()
      setTracks(data.tracks || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/tracks/${branchId}`)
        if (cancelled) return
        const data = await res.json()
        setTracks(data.tracks || [])
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [branchId, refreshKey])

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
        <TrackItem key={track.id} branchId={branchId} track={track} onChanged={loadTracks} />
      ))}
    </List>
  )
}

export default TrackList
