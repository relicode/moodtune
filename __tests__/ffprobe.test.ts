import { readdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'

import { extractMetadata } from '$/lib/ffprobe'

const TEST_DATA = join(__dirname, 'test-data')
const EXPECTED_DURATION = 10

const audioFiles = (await readdir(TEST_DATA)).filter((f) => f.startsWith('test-audio.')).map((f) => join(TEST_DATA, f))

describe('extractMetadata', () => {
  afterAll(async () => {
    const tmpFiles = (await readdir(tmpdir())).filter((f) => f.startsWith('moodtune-'))
    expect(tmpFiles).toEqual([])
  })

  describe.each(audioFiles.map((f) => [f.split('/').pop()!, f]))('%s', (_name, filePath) => {
    it('extracts a duration within 1s of expected', async () => {
      const meta = await extractMetadata(filePath)
      expect(meta.duration).toBeGreaterThan(EXPECTED_DURATION - 1)
      expect(meta.duration).toBeLessThan(EXPECTED_DURATION + 1)
    })

    it('returns null for missing tags', async () => {
      const meta = await extractMetadata(filePath)
      // Test files have no embedded tags
      expect(meta.title).toBeNull()
      expect(meta.artist).toBeNull()
      expect(meta.genre).toBeNull()
    })
  })

  it('rejects a nonexistent file', async () => {
    await expect(extractMetadata('/tmp/moodtune-nonexistent')).rejects.toThrow()
  })

  it('rejects an empty file', async () => {
    await expect(extractMetadata('/dev/null')).rejects.toThrow()
  })
})
