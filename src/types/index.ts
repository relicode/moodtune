export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export type User = {
  id: string
  username: string
  passwordHash: string
  role: UserRole
  createdAt: string
}

export type SessionPayload = Readonly<{
  userId: string
  username: string
  role: UserRole
  venueIds: readonly string[]
}>

export type Venue = {
  id: string
  name: string
  description: string
  createdAt: string
}

export enum BranchType {
  FOLDER = 'FOLDER',
  PLAYLIST = 'PLAYLIST',
}

export enum PlaylistUiOption {
  SHUFFLE = 'SHUFFLE',
  SHOW_TRACK_NAMES = 'SHOW_TRACK_NAMES',
  SHOW_CONTROLS_RANDOM = 'SHOW_CONTROLS_RANDOM',
  SHOW_CONTROLS_SHUFFLE = 'SHOW_CONTROLS_SHUFFLE',
}

type BranchBase = {
  id: string
  venueId: string
  parentId?: string
  name: string
  imagePath?: string
  createdAt: string
}

export type Branch<T extends BranchType = BranchType> = BranchBase &
  (T extends BranchType.PLAYLIST
    ? { type: BranchType.PLAYLIST; random: number; ui: PlaylistUiOption[] }
    : { type: BranchType.FOLDER })

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

type PlaylistTrackBase = {
  id: string
  url: string
  duration: number
}

export type PlaylistTrack<A extends boolean = true> = A extends true
  ? PlaylistTrackBase & { name: string; artist: string }
  : PlaylistTrackBase

export type Playlist<A extends boolean = true> = {
  id: string
  name: string
  tracks: PlaylistTrack<A>[]
  randomTracks: PlaylistTrack<A>[]
  randomTrackProbability: number
  ui: PlaylistUiOption[]
}

export type ActionResult = {
  success: boolean
  error?: string
}
