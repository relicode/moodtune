'use client'

import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { useState } from 'react'

import { deleteVenueAction } from '$/actions/admin'
import type { Venue } from '$/types'
import BranchCreateForm from './BranchCreateForm'
import BranchTree from './BranchTree'
import UserManager from './UserManager'
import VenueEditForm from './VenueEditForm'

type VenueCardProps = {
  venue: Venue
}

const VenueCard = ({ venue }: VenueCardProps) => {
  const [tab, setTab] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [branchRefreshKey, setBranchRefreshKey] = useState(0)
  const confirm = useConfirm()

  const handleDelete = async () => {
    try {
      await confirm({ description: `Delete venue "${venue.name}"? This cannot be undone.` })
    } catch {
      return
    }
    await deleteVenueAction(venue.id)
  }

  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ flex: 1, fontWeight: 500, mr: 1 }}>{venue.name}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ flexShrink: 0 }}>
            <Tab label="Branches" />
            <Tab label="Users" />
          </Tabs>
          <Stack direction="row">
            {tab === 0 && (
              <Tooltip title="Add branch">
                <IconButton size="small" color="success" onClick={() => setAddOpen(true)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit venue">
              <IconButton size="small" color="info" onClick={() => setEditOpen(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete venue">
              <IconButton size="small" color="error" onClick={handleDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Divider />
        {tab === 0 && <BranchTree venueId={venue.id} key={branchRefreshKey} />}
        {tab === 1 && <UserManager venueId={venue.id} />}
      </AccordionDetails>
      <BranchCreateForm
        venueId={venue.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => setBranchRefreshKey((k) => k + 1)}
      />
      <VenueEditForm venue={venue} open={editOpen} onClose={() => setEditOpen(false)} />
    </Accordion>
  )
}

export default VenueCard
