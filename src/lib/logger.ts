import 'server-only'

import pino from 'pino'

// Intentional globalThis cache: Next.js hot-reloads modules in dev, which would
// otherwise spawn duplicate pino transport workers writing to the same log file.
const getLogger = () => {
  const globalPino = globalThis as typeof globalThis & { __pino?: pino.Logger }

  if (!globalPino.__pino) {
    const isDev = process.env.NODE_ENV !== 'production'
    const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')

    globalPino.__pino = pino({
      level: logLevel,
      transport: {
        targets: isDev
          ? [{ target: 'pino-pretty', level: logLevel }]
          : [{ target: 'pino/file', options: { destination: '/data/log/app.log', mkdir: true }, level: logLevel }],
      },
    })
  }

  return globalPino.__pino
}

const log = getLogger()

export const createLogger = (name: string) => log.child({ module: name })

export default log
