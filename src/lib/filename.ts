export const sanitizeExtension = (name: string): string => {
  const ext = name.split('.').pop() ?? ''
  return ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin'
}

export const parseFilename = (name: string): { artist: string | null; title: string | null } => {
  const stem = name.replace(/\.[^.]+$/, '')
  const parts = stem.split('___')

  // artist___title or 123___artist___title
  if (parts.length === 2) return { artist: parts[0], title: parts[1] }
  if (parts.length >= 3) return { artist: parts[1], title: parts[2] }

  return { artist: null, title: null }
}
