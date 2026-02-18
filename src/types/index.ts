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

export type PlaylistUiOption = 'SHOW_TRACK_NAMES' | 'SHOW_CONTROLS_RANDOM' | 'SHOW_CONTROLS_SHUFFLE'

export type Branch = {
  id: string
  venueId: string
  parentId: string | null
  name: string
  type: BranchType
  imagePath: string | null
  random: number
  shuffle: boolean
  shuffleVisibleToUser: boolean
  ui: PlaylistUiOption[]
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

export type PlaylistTrack = {
  url: string
  name: string
  artist: string
  duration: number
}

export type PlaylistResponse = {
  id: string
  name: string
  tracks: PlaylistTrack[]
  randomTracks: PlaylistTrack[]
  randomTrackProbability: number
  shuffle: boolean
  shuffleVisibleToUser: boolean
  ui: PlaylistUiOption[]
}

export type ActionResult = {
  success: boolean
  error?: string
}

export type LoginFormState = {
  success: boolean
  error?: string
}
