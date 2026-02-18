import 'server-only'

import { Readable } from 'stream'

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
