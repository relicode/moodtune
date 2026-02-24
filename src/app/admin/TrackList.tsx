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
import { formatDuration } from '$/lib/utils'
import type { Track } from '$/types'
import TrackEditForm from './TrackEditForm'

type TrackListProps = {
  branchId: string
  refreshKey: number
  pool?: 'main' | 'random'
  onDurationChange?: (totalSeconds: number) => void
}

type TrackItemProps = {
  branchId: string
  track: Track
  pool: 'main' | 'random'
  onChanged: () => void
}

const TrackItem = ({ branchId, track, pool, onChanged }: TrackItemProps) => {
  const [editOpen, setEditOpen] = useState(false)
  const confirm = useConfirm()

  const handleDelete = async () => {
    const { confirmed } = await confirm({ description: `Remove track "${track.title}"?` })
    if (!confirmed) return
    await removeTrackAction(branchId, track.id, pool)
    onChanged()
  }

  return (
    <>
      <ListItem
        secondaryAction={
          <Stack direction="row" spacing={1}>
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

const TrackList = ({ branchId, refreshKey, pool = 'main', onDurationChange }: TrackListProps) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  const loadTracks = async () => {
    try {
      const url = pool === 'random' ? `/api/admin/tracks/${branchId}?pool=random` : `/api/admin/tracks/${branchId}`
      const res = await fetch(url)
      const data = await res.json()
      const loaded: Track[] = data.tracks || []
      setTracks(loaded)
      onDurationChange?.(loaded.reduce((sum, t) => sum + t.duration, 0))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTracks()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTracks is stable via React Compiler; including it would cause an infinite loop
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
        <TrackItem key={track.id} branchId={branchId} track={track} pool={pool} onChanged={loadTracks} />
      ))}
    </List>
  )
}

export default TrackList
