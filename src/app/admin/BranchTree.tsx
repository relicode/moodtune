'use client'

import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { createContext, useContext, useEffect, useState } from 'react'

import { deleteBranchAction, setBranchRandomAction } from '$/actions/admin'
import type { Branch } from '$/types'
import BranchCreateForm from './BranchCreateForm'
import BranchEditForm from './BranchEditForm'
import TrackList from './TrackList'
import TrackUploader from './TrackUploader'

const formatEstimatedDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

type BranchTreeContext = {
  openBranches: string[]
  toggleBranch: (id: string) => void
  refreshKey: number
  refresh: () => void
}

const BranchTreeContext = createContext<BranchTreeContext>({
  openBranches: [],
  toggleBranch: () => {},
  refreshKey: 0,
  refresh: () => {},
})

type BranchTreeProps = {
  venueId: string
  parentId?: string
}

type BranchItemProps = {
  venueId: string
  branch: Branch
  onChanged: () => void
}

const BranchItem = ({ venueId, branch, onChanged }: BranchItemProps) => {
  const { openBranches, toggleBranch, refresh } = useContext(BranchTreeContext)
  const open = openBranches.includes(branch.id)
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [tracksOpen, setTracksOpen] = useState(false)
  const [trackRefreshKey, setTrackRefreshKey] = useState(0)
  const [randomRefreshKey, setRandomRefreshKey] = useState(0)
  const [random, setRandom] = useState(branch.random ?? 0)
  const [mainDuration, setMainDuration] = useState(0)
  const [randomDuration, setRandomDuration] = useState(0)
  const confirm = useConfirm()
  const canAdd = branch.type === 'folder'

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const { confirmed } = await confirm({ description: `Delete branch "${branch.name}"?` })
    if (!confirmed) return
    await deleteBranchAction(venueId, branch.id, branch.parentId)
    onChanged()
  }

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ListItemButton
          onClick={() => (branch.type === 'folder' ? toggleBranch(branch.id) : setTracksOpen(true))}
          sx={{ flexGrow: 1 }}
        >
          <ListItemIcon>
            {branch.type === 'folder' ? open ? <FolderOpenIcon /> : <FolderIcon /> : <QueueMusicIcon />}
          </ListItemIcon>
          <ListItemText primary={branch.name} />
        </ListItemButton>
        {canAdd && (
          <Tooltip title="Add sub-branch">
            <IconButton size="small" color="success" onClick={() => setAddOpen(true)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Edit branch">
          <IconButton size="small" color="info" onClick={() => setEditOpen(true)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Open in venue">
          <IconButton size="small" color="primary" href={`/venue/${venueId}/${branch.id}`} target="_blank">
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete branch">
          <IconButton size="small" color="error" onClick={handleDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <BranchEditForm branch={branch} open={editOpen} onClose={() => setEditOpen(false)} onUpdated={onChanged} />
      {canAdd && (
        <BranchCreateForm
          venueId={venueId}
          parentId={branch.id}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            onChanged()
            refresh()
          }}
        />
      )}

      {branch.type === 'folder' && (
        <Collapse in={open} unmountOnExit>
          <Box sx={{ pl: 4, pt: 1, ml: 2, borderLeft: 2, borderColor: 'divider' }}>
            <BranchTree venueId={venueId} parentId={branch.id} />
          </Box>
        </Collapse>
      )}

      {branch.type === 'playlist' && (
        <Dialog open={tracksOpen} onClose={() => setTracksOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ textAlign: 'center' }}>
            {branch.name}
            {(mainDuration > 0 || randomDuration > 0) &&
              ` (${formatEstimatedDuration(mainDuration + randomDuration * (random / 100))})`}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1, textAlign: 'center' }} gutterBottom>
                Random probability: {random}%
              </Typography>
              <Slider
                value={random}
                min={0}
                max={100}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
                onChange={(_e, v) => setRandom(v as number)}
                onChangeCommitted={async (_e, v) => {
                  const result = await setBranchRandomAction(branch.id, v as number)
                  if (!result.success) setRandom(branch.random ?? 0)
                }}
              />
            </Box>
            <Stack
              direction="row"
              divider={<Divider orientation="vertical" flexItem />}
              spacing={2}
              sx={{ minHeight: 0, flex: 1 }}
            >
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 2, flexShrink: 0 }}
                >
                  <Typography variant="subtitle2">Tracks</Typography>
                  <TrackUploader branchId={branch.id} onUploaded={() => setTrackRefreshKey((k) => k + 1)} />
                </Stack>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  <TrackList branchId={branch.id} refreshKey={trackRefreshKey} onDurationChange={setMainDuration} />
                </Box>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 2, flexShrink: 0 }}
                >
                  <Typography variant="subtitle2">Random Tracks</Typography>
                  <TrackUploader
                    branchId={branch.id}
                    pool="random"
                    onUploaded={() => setRandomRefreshKey((k) => k + 1)}
                  />
                </Stack>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  <TrackList
                    branchId={branch.id}
                    refreshKey={randomRefreshKey}
                    pool="random"
                    onDurationChange={setRandomDuration}
                  />
                </Box>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTracksOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}

const BranchTreeInner = ({ venueId, parentId }: BranchTreeProps) => {
  const { refreshKey } = useContext(BranchTreeContext)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  const loadBranches = async () => {
    try {
      const url = parentId ? `/api/admin/branches/${venueId}?parentId=${parentId}` : `/api/admin/branches/${venueId}`
      const res = await fetch(url)
      const data = await res.json()
      const loaded: Branch[] = data.branches || []
      setBranches(loaded)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadBranches is stable via React Compiler; including it would cause an infinite loop
  }, [venueId, parentId, refreshKey])

  return (
    <>
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      ) : branches.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No branches yet.
        </Typography>
      ) : (
        <List dense sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {branches.map((branch) => (
            <BranchItem key={branch.id} venueId={venueId} branch={branch} onChanged={loadBranches} />
          ))}
        </List>
      )}
    </>
  )
}

const BranchTree = ({ venueId, parentId }: BranchTreeProps) => {
  const [openBranches, setOpenBranches] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const toggleBranch = (id: string) => {
    setOpenBranches((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  const refresh = () => setRefreshKey((k) => k + 1)

  // Only provide context at the root level (no parentId)
  if (parentId) return <BranchTreeInner venueId={venueId} parentId={parentId} />

  return (
    <BranchTreeContext value={{ openBranches, toggleBranch, refreshKey, refresh }}>
      <BranchTreeInner venueId={venueId} />
    </BranchTreeContext>
  )
}

export default BranchTree
