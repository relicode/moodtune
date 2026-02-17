'use client'

import DeleteIcon from '@mui/icons-material/Delete'
import FolderIcon from '@mui/icons-material/Folder'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { useEffect, useState } from 'react'

import { deleteBranchAction } from '$/actions/admin'
import type { Branch } from '$/types'
import BranchCreateForm from './BranchCreateForm'
import TrackList from './TrackList'
import TrackUploader from './TrackUploader'

type BranchTreeProps = {
  venueId: string
  parentId: string | null
}

type BranchItemProps = {
  venueId: string
  branch: Branch
  onDeleted: () => void
}

const BranchItem = ({ venueId, branch, onDeleted }: BranchItemProps) => {
  const [open, setOpen] = useState(false)
  const [trackRefreshKey, setTrackRefreshKey] = useState(0)
  const confirm = useConfirm()

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await confirm({ description: `Delete branch "${branch.name}"?` })
      await deleteBranchAction(venueId, branch.id, branch.parentId)
      onDeleted()
    } catch {
      // cancelled
    }
  }

  return (
    <>
      <ListItemButton onClick={() => setOpen(!open)}>
        <ListItemIcon>{branch.type === 'folder' ? <FolderIcon /> : <QueueMusicIcon />}</ListItemIcon>
        <ListItemText primary={branch.name} secondary={branch.type} />
        <IconButton size="small" color="error" onClick={handleDelete}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </ListItemButton>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ pl: 4, pt: 1 }}>
          {branch.type === 'folder' ? (
            <BranchTree venueId={venueId} parentId={branch.id} />
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

const BranchTree = ({ venueId, parentId }: BranchTreeProps) => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  const loadBranches = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ venueId })
      if (parentId) params.set('parentId', parentId)
      const res = await fetch(`/api/admin/branches?${params}`)
      const data = await res.json()
      setBranches(data.branches || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranches()
  }, [venueId, parentId]) // loadBranches is stable via React Compiler

  return (
    <>
      <BranchCreateForm venueId={venueId} parentId={parentId} onCreated={loadBranches} />

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
            <BranchItem key={branch.id} venueId={venueId} branch={branch} onDeleted={loadBranches} />
          ))}
        </List>
      )}
    </>
  )
}

export default BranchTree
