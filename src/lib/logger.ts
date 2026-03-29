/**
 * Custom logger to reduce noise in development
 * Reduces repetitive HTTP request logs while keeping important business logs
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Paths that should not log in development (to reduce noise)
const QUIET_PATHS = [
  '/api/book-import/tasks/',
  '/api/projects/',
  '/api/auth/',
]

// HTTP methods that are less important
const QUIET_METHODS = ['GET']

export function shouldLogRequest(path: string, method: string): boolean {
  // In production, only log errors
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  // In development, skip noisy GET requests to frequently polled endpoints
  if (QUIET_METHODS.includes(method)) {
    return !QUIET_PATHS.some(quietPath => path.includes(quietPath))
  }

  // Log all other requests
  return true
}

export function formatLogMessage(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString().split('T')[1]?.slice(0, -1)
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`

  if (meta && Object.keys(meta).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(meta)}`
  }

  return `${prefix} ${message}`
}

// Business log levels for important operations
export const businessLog = {
  // Important: Always show these
  important: (message: string, meta?: Record<string, unknown>) => {
    console.log(formatLogMessage('info', `✨ ${message}`, meta))
  },

  // Normal business operations
  info: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLogMessage('info', message, meta))
    }
  },

  // Warnings
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(formatLogMessage('warn', message, meta))
  },

  // Errors
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(formatLogMessage('error', message, meta))
  },
}