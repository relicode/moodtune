import 'server-only'

import { createWriteStream } from 'fs'
import { Readable, Writable } from 'stream'

export const toReadableStream = (readable: Readable): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      readable.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
      readable.on('end', () => controller.close())
      readable.on('error', (err) => controller.error(err))
    },
    cancel() {
      readable.destroy()
    },
  })

export const streamToFile = async (stream: ReadableStream<Uint8Array>, filePath: string) => {
  const writable = Writable.toWeb(createWriteStream(filePath, { mode: 0o600 }))
  await stream.pipeTo(writable)
}
