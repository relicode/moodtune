'use client'

import type { DragEndEvent } from '@dnd-kit/core'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditIcon from '@mui/icons-material/Edit'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { useEffect, useState } from 'react'

import { removeTrackAction, reorderTracksAction } from '$/actions/admin'
import { formatDuration } from '$/lib/utils'
import type { Track } from '$/types'
import TrackEditForm from './TrackEditForm'
import TrackUploader from './TrackUploader'

const LABELS = { main: 'Tracks', random: 'Random Tracks' } as const

type TrackListProps = {
  branchId: string
  pool?: 'main' | 'random'
  onDurationChange?: (totalSeconds: number) => void
}

type TrackItemProps = {
  branchId: string
  track: Track
  pool: 'main' | 'random'
  onChanged: () => void
}

const TrackItem = ({ branchId, track, pool, onChanged, sortable }: TrackItemProps & { sortable?: boolean }) => {
  const [editOpen, setEditOpen] = useState(false)
  const confirm = useConfirm()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
    disabled: !sortable,
  })

  const handleDelete = async () => {
    const { confirmed } = await confirm({ description: `Remove track "${track.title}"?` })
    if (!confirmed) return
    await removeTrackAction(branchId, track.id, pool)
    onChanged()
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <ListItem
        sx={{ bgcolor: 'background.default', borderRadius: 1, mb: 0.5 }}
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
        {sortable && (
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Tooltip title="Drag to reorder">
              <DragIndicatorIcon
                sx={{
                  cursor: isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  color: 'text.secondary',
                  outline: 'none',
                }}
                {...attributes}
                {...listeners}
              />
            </Tooltip>
          </ListItemIcon>
        )}
        <ListItemText
          primary={track.title}
          secondary={`${track.artist || 'Unknown'} • ${formatDuration(track.duration)}`}
        />
      </ListItem>
      <TrackEditForm track={track} open={editOpen} onClose={() => setEditOpen(false)} onUpdated={onChanged} />
    </div>
  )
}

const TrackList = ({ branchId, pool = 'main', onDurationChange }: TrackListProps) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [duration, setDuration] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const loadTracks = async () => {
    try {
      const url = pool === 'random' ? `/api/admin/tracks/${branchId}?pool=random` : `/api/admin/tracks/${branchId}`
      const res = await fetch(url)
      const data = await res.json()
      const loaded: Track[] = data.tracks || []
      setTracks(loaded)
      const total = loaded.reduce((sum, t) => sum + t.duration, 0)
      setDuration(total)
      onDurationChange?.(total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tracks.findIndex((t) => t.id === active.id)
    const newIndex = tracks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...tracks]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const previous = tracks
    setTracks(reordered)

    try {
      const result = await reorderTracksAction(
        branchId,
        reordered.map((t) => t.id),
        pool
      )
      if (!result.success) setTracks(previous)
    } catch {
      setTracks(previous)
    }
  }

  useEffect(() => {
    loadTracks()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTracks is stable via React Compiler; including it would cause an infinite loop
  }, [branchId])

  const label = LABELS[pool]

  let content
  if (loading) {
    content = (
      <Typography variant="body2" color="text.secondary">
        Loading tracks...
      </Typography>
    )
  } else if (tracks.length === 0) {
    content = (
      <Typography variant="body2" color="text.secondary">
        No tracks yet.
      </Typography>
    )
  } else {
    content = (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tracks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <List dense sx={{ overflow: 'clip' }}>
            {tracks.map((track) => (
              <TrackItem key={track.id} branchId={branchId} track={track} pool={pool} onChanged={loadTracks} sortable />
            ))}
          </List>
        </SortableContext>
      </DndContext>
    )
  }

  return (
    <Stack gap={1} sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ flexShrink: 0 }}>
        <Typography variant="subtitle2">
          {label}
          {duration > 0 && ` (${formatDuration(duration, 'long')})`}
        </Typography>
        <TrackUploader branchId={branchId} pool={pool === 'main' ? undefined : pool} onUploaded={loadTracks} />
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{content}</Box>
    </Stack>
  )
}

export default TrackList
