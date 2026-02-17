'use client'

import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { createContext, useContext, useEffect, useState } from 'react'

import { deleteBranchAction } from '$/actions/admin'
import type { Branch } from '$/types'
import BranchCreateForm from './BranchCreateForm'
import BranchEditForm from './BranchEditForm'
import TrackList from './TrackList'
import TrackUploader from './TrackUploader'

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
  onChildrenLoaded?: (childType: 'folder' | 'playlist' | undefined) => void
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
  const [childType, setChildType] = useState<'folder' | 'playlist' | undefined>(undefined)
  const [trackRefreshKey, setTrackRefreshKey] = useState(0)
  const confirm = useConfirm()
  const canAdd = branch.type === 'folder' && childType !== 'playlist'

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const { confirmed } = await confirm({ description: `Delete branch "${branch.name}"?` })
    if (!confirmed) return
    await deleteBranchAction(venueId, branch.id, branch.parentId)
    onChanged()
  }

  return (
    <>
      <Stack direction="row" alignItems="center">
        <ListItemButton onClick={() => toggleBranch(branch.id)} sx={{ flexGrow: 1 }}>
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
          allowedType={childType === 'folder' ? 'folder' : undefined}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            onChanged()
            refresh()
          }}
        />
      )}

      <Collapse in={open} unmountOnExit>
        <Box sx={{ pl: 4, pt: 1, ml: 2, borderLeft: 2, borderColor: 'divider' }}>
          {branch.type === 'folder' ? (
            <BranchTree venueId={venueId} parentId={branch.id} onChildrenLoaded={setChildType} />
          ) : (
            <>
              <TrackList branchId={branch.id} refreshKey={trackRefreshKey} />
              <TrackUploader branchId={branch.id} onUploaded={() => setTrackRefreshKey((k) => k + 1)} />
            </>
          )}
        </Box>
      </Collapse>
    </>
  )
}

const BranchTreeInner = ({ venueId, parentId, onChildrenLoaded }: BranchTreeProps) => {
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
      onChildrenLoaded?.(loaded.length > 0 ? loaded[0].type : undefined)
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

const BranchTree = ({ venueId, parentId, onChildrenLoaded }: BranchTreeProps) => {
  const [openBranches, setOpenBranches] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const toggleBranch = (id: string) => {
    setOpenBranches((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  const refresh = () => setRefreshKey((k) => k + 1)

  // Only provide context at the root level (no parentId)
  if (parentId) return <BranchTreeInner venueId={venueId} parentId={parentId} onChildrenLoaded={onChildrenLoaded} />

  return (
    <BranchTreeContext value={{ openBranches, toggleBranch, refreshKey, refresh }}>
      <BranchTreeInner venueId={venueId} onChildrenLoaded={onChildrenLoaded} />
    </BranchTreeContext>
  )
}

export default BranchTree
