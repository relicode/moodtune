import { ImageResponse } from 'next/og'

// MusicNote SVG path from @mui/icons-material
const MUSIC_NOTE_PATH = 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3z'
const THEME_COLOR = '#00796B'

export const generateIcon = (size: number) =>
  new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: THEME_COLOR,
      }}
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.6)} height={Math.round(size * 0.6)}>
        <path d={MUSIC_NOTE_PATH} fill="white" />
      </svg>
    </div>,
    { width: size, height: size }
  )
