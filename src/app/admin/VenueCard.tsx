'use client'

import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { useState } from 'react'

import { deleteVenueAction } from '$/actions/admin'
import { track } from '$/lib/analytics'
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
    const { confirmed } = await confirm({ description: `Delete venue "${venue.name}"? This cannot be undone.` })
    if (!confirmed) return
    track('admin-venue-delete', { venueId: venue.id })
    await deleteVenueAction(venue.id)
  }

  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          '& .MuiAccordionSummary-content': { flexGrow: 0 },
          justifyContent: 'center',
          gap: 0.5,
        }}
      >
        <Typography sx={{ fontWeight: 500 }}>{venue.name}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ flexShrink: 0 }}>
            <Tab label="Branches" />
            <Tab label="Users" />
          </Tabs>
          <Stack direction="row" spacing={1}>
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
            <Tooltip title="Open venue">
              <IconButton size="small" color="primary" href={`/venue/${venue.id}`} target="_blank">
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete venue">
              <IconButton size="small" color="error" onClick={handleDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack>
          {tab === 0 && <BranchTree venueId={venue.id} key={branchRefreshKey} />}
          {tab === 1 && <UserManager venueId={venue.id} />}
        </Stack>
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
