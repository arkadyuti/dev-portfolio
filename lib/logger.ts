// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Default log level based on environment
const DEFAULT_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

// You can override the log level with an environment variable
const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || DEFAULT_LOG_LEVEL

// Define the importance order of log levels
const LOG_LEVEL_IMPORTANCE: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Whether a given log level should be logged based on the configured level
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVEL_IMPORTANCE[level] >= LOG_LEVEL_IMPORTANCE[LOG_LEVEL]
}

// Current timestamp for logs
const timestamp = (): string => {
  return new Date().toISOString()
}

// Log formatting
const formatLog = (level: LogLevel, message: string, meta?: unknown): string => {
  const ts = timestamp()
  let logString = `[${ts}] [${level.toUpperCase()}] ${message}`

  if (meta) {
    try {
      // Add metadata if provided
      const metaString = typeof meta === 'object' ? JSON.stringify(meta) : String(meta)
      logString += ` - ${metaString}`
    } catch (e) {
      logString += ` - [Error serializing metadata]`
    }
  }

  return logString
}

// Logger methods
export const logger = {
  debug: (message: string, meta?: unknown) => {
    if (shouldLog('debug')) {
      console.log(formatLog('debug', message, meta))
    }
  },

  info: (message: string, meta?: unknown) => {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, meta))
    }
  },

  warn: (message: string, meta?: unknown) => {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, meta))
    }
  },

  error: (message: string, meta?: unknown) => {
    if (shouldLog('error')) {
      logger.error(formatLog('error', message, meta))
    }
  },
}

export default logger
