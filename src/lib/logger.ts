import 'server-only'

import { join } from 'path'
import pino from 'pino'

// Intentional globalThis cache: Next.js hot-reloads modules in dev, which would
// otherwise spawn duplicate pino transport workers writing to the same log file.
const getLogger = () => {
  const globalPino = globalThis as typeof globalThis & { __pino?: pino.Logger }

  if (!globalPino.__pino) {
    const logDir = process.env.LOG_DIR
    if (!logDir) throw new Error('LOG_DIR must be set')

    const isDev = process.env.NODE_ENV !== 'production'
    const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')
    const logFile = join(logDir, 'app.log')

    globalPino.__pino = pino({
      level: logLevel,
      transport: {
        targets: [
          { target: 'pino/file', options: { destination: logFile, mkdir: true }, level: logLevel },
          ...(isDev ? [{ target: 'pino-pretty', level: logLevel }] : []),
        ],
      },
    })
  }

  return globalPino.__pino
}

const log = getLogger()

export const createLogger = (name: string) => log.child({ module: name })

export default log
