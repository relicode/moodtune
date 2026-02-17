'use client'

import Box from '@mui/material/Box'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import ImageListItemBar from '@mui/material/ImageListItemBar'
import Link from 'next/link'

type BranchGridItem = {
  id: string
  name: string
  imageUrl: string | null
}

type BranchGridProps = {
  venueId: string
  branches: BranchGridItem[]
}

const BranchGrid = ({ venueId, branches }: BranchGridProps) => (
  <ImageList cols={3} gap={16} sx={{ mt: 2 }}>
    {branches.map((branch) => (
      <ImageListItem
        key={branch.id}
        component={Link}
        href={`/venue/${venueId}/${branch.id}`}
        prefetch={false}
        sx={{
          textDecoration: 'none',
          borderRadius: 2,
          overflow: 'hidden',
          '&:hover': { opacity: 0.85 },
        }}
      >
        <Box
          component="img"
          src={branch.imageUrl || '/placeholder-branch.svg'}
          alt={branch.name}
          loading="lazy"
          sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
        />
        <ImageListItemBar title={branch.name} />
      </ImageListItem>
    ))}
  </ImageList>
)

export default BranchGrid
