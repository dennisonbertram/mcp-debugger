
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  error?: { name: string; message: string; stack?: string };
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: Record<string, any>, error?: Error): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
      ...(error && { error: { name: error.name, message: error.message, ...(error.stack ? { stack: error.stack } : {}) } })
    };

    return JSON.stringify(logEntry, null, this.level === 'debug' ? 2 : 0);
  }

  debug(message: string, data?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: Record<string, any>, error?: Error): void {
    if (this.shouldLog('warn')) {
      console.error(this.formatMessage('warn', message, data, error));
    }
  }

  error(message: string, data?: Record<string, any>, error?: Error): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data, error));
    }
  }
}

// Create singleton logger instance
export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);

// Update logger level if environment variable changes
if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL as LogLevel);
}
