import { readdir } from 'fs/promises'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

import { parseFilename } from '$/lib/filename'

const TEST_DATA = join(__dirname, 'test-data')

const symlinks = (await readdir(TEST_DATA)).filter((f) => !f.startsWith('test-audio'))

describe('parseFilename', () => {
  it('extracts artist and title from artist___title.ext', () => {
    const link = symlinks.find((f) => f.startsWith('Acido'))!
    expect(link).toBeDefined()
    const result = parseFilename(link)
    expect(result).toEqual({ artist: 'Acido Infinito', title: 'Orbital Drift' })
  })

  it('extracts artist and title from 123___artist___title.ext', () => {
    const link = symlinks.find((f) => f.startsWith('00001'))!
    expect(link).toBeDefined()
    const result = parseFilename(link)
    expect(result).toEqual({ artist: 'Acido Infinito', title: 'Orbital Drift' })
  })

  it('returns nulls for plain filenames', () => {
    const link = symlinks.find((f) => f.startsWith('no-'))!
    expect(link).toBeDefined()
    const result = parseFilename(link)
    expect(result).toEqual({ artist: null, title: null })
  })

  it('returns nulls for filenames without ___ separator', () => {
    expect(parseFilename('some-track.mp3')).toEqual({ artist: null, title: null })
    expect(parseFilename('track.opus')).toEqual({ artist: null, title: null })
  })
})
