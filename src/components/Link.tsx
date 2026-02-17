'use client'

import MuiLink from '@mui/material/Link'
import type { LinkProps as MuiLinkProps } from '@mui/material/Link'
import NextLink from 'next/link'

type LinkProps = Omit<MuiLinkProps<typeof NextLink>, 'component'>

const Link = (props: LinkProps) => <MuiLink component={NextLink} {...props} />

export default Link
