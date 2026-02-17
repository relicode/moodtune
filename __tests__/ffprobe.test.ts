import { readdir, readFile } from 'fs/promises'
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
      const buffer = await readFile(filePath)
      const meta = await extractMetadata(buffer)
      expect(meta.duration).toBeGreaterThan(EXPECTED_DURATION - 1)
      expect(meta.duration).toBeLessThan(EXPECTED_DURATION + 1)
    })

    it('returns null for missing tags', async () => {
      const buffer = await readFile(filePath)
      const meta = await extractMetadata(buffer)
      // Test files have no embedded tags
      expect(meta.title).toBeNull()
      expect(meta.artist).toBeNull()
      expect(meta.genre).toBeNull()
    })
  })

  it('rejects an empty buffer', async () => {
    await expect(extractMetadata(Buffer.alloc(0))).rejects.toThrow()
  })

  it('rejects random bytes', async () => {
    const garbage = Buffer.from(crypto.getRandomValues(new Uint8Array(1024)))
    await expect(extractMetadata(garbage)).rejects.toThrow()
  })
})
