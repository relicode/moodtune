'use client'

import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { useState } from 'react'

import { deleteVenueAction } from '$/actions/admin'
import type { Venue } from '$/types'
import BranchTree from './BranchTree'
import UserManager from './UserManager'

type VenueCardProps = {
  venue: Venue
}

const VenueCard = ({ venue }: VenueCardProps) => {
  const [tab, setTab] = useState(0)
  const confirm = useConfirm()

  const handleDelete = async () => {
    try {
      await confirm({ description: `Delete venue "${venue.name}"? This cannot be undone.` })
      await deleteVenueAction(venue.id)
    } catch {
      // cancelled
    }
  }

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, mr: 1 }}>
          <Typography sx={{ flex: 1 }}>{venue.name}</Typography>
          {venue.description && (
            <Typography variant="body2" color="text.secondary">
              {venue.description}
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ flex: 1 }}>
          <Tab label="Users" />
          <Tab label="Branches" />
        </Tabs>
          <IconButton size="small" color="error" onClick={handleDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
        {tab === 0 && <UserManager venueId={venue.id} />}
        {tab === 1 && <BranchTree venueId={venue.id} parentId={null} />}
      </AccordionDetails>
    </Accordion>
  )
}

export default VenueCard
