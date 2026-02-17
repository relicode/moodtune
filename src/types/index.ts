export type UserRole = 'admin' | 'user'

export type User = {
  id: string
  username: string
  passwordHash: string
  role: UserRole
  createdAt: string
}

export type SessionPayload = {
  userId: string
  username: string
  role: UserRole
  venueIds: string[]
}

export type Venue = {
  id: string
  name: string
  description: string
  createdAt: string
}

export type BranchType = 'folder' | 'playlist'

export type Branch = {
  id: string
  venueId: string
  parentId: string | null
  name: string
  type: BranchType
  imagePath: string | null
  createdAt: string
}

export type PlaylistSummary = {
  id: string
  venueId: string
  name: string
}

export type Track = {
  id: string
  title: string
  artist: string
  fileName: string
  duration: number
  createdAt: string
}

export type ActionResult = {
  success: boolean
  error?: string
}

export type LoginFormState = {
  success: boolean
  error?: string
}
