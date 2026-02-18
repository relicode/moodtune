'use client'

import LogoutIcon from '@mui/icons-material/Logout'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import StarIcon from '@mui/icons-material/Star'
import UndoIcon from '@mui/icons-material/Undo'
import Badge from '@mui/material/Badge'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Paper from '@mui/material/Paper'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { logout } from '$/actions/auth'
import { getParentBranchInfo } from '$/actions/branches'
import { UserRole } from '$/types'
import type { PlaylistSummary } from '$/types'

type VenueBottomNavProps = {
  playlists: PlaylistSummary[]
  role: UserRole
}

const VenueBottomNav = ({ playlists, role }: VenueBottomNavProps) => {
  const pathname = usePathname()
  const [parentHref, setParentHref] = useState<string | null>(null)

  const segments = pathname.split('/')
  // /venue/[venueId]/[branchId] → segments = ['', 'venue', venueId, branchId]
  const branchId = segments.length >= 4 ? segments[3] : null

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const info = branchId ? await getParentBranchInfo(branchId) : null
      if (cancelled) return
      setParentHref(info ? `/venue/${info.venueId}/${info.parentId}` : null)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [branchId])

  const playlistPaths = playlists.map((p) => `/venue/${p.venueId}/${p.id}`)
  const matchIndex = playlistPaths.indexOf(pathname)
  // Offset by 1 when the Back button is rendered, since it occupies child index 0
  const activeValue = matchIndex !== -1 ? matchIndex + (parentHref ? 1 : 0) : false

  return (
    <Paper elevation={3}>
      <BottomNavigation value={activeValue} showLabels>
        {parentHref && (
          <BottomNavigationAction
            label="Back"
            icon={<UndoIcon />}
            component={Link}
            href={parentHref}
            prefetch={false}
          />
        )}
        {playlists.map((playlist) => (
          <BottomNavigationAction
            key={playlist.id}
            label={playlist.name}
            icon={<QueueMusicIcon />}
            component={Link}
            href={`/venue/${playlist.venueId}/${playlist.id}`}
            prefetch={false}
          />
        ))}
        <BottomNavigationAction
          label="Logout"
          icon={
            role === UserRole.ADMIN ? (
              <Badge badgeContent={<StarIcon sx={{ fontSize: '0.75rem' }} />} color="warning" overlap="circular">
                <LogoutIcon />
              </Badge>
            ) : (
              <LogoutIcon />
            )
          }
          onClick={async () => {
            await logout()
          }}
        />
      </BottomNavigation>
    </Paper>
  )
}

export default VenueBottomNav
