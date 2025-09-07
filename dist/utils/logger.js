const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
class Logger {
    level;
    constructor(level = 'info') {
        this.level = level;
    }
    setLevel(level) {
        this.level = level;
    }
    shouldLog(level) {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
    }
    formatMessage(level, message, data, error) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...(data && { data }),
            ...(error && { error: { name: error.name, message: error.message, ...(error.stack ? { stack: error.stack } : {}) } })
        };
        return JSON.stringify(logEntry, null, this.level === 'debug' ? 2 : 0);
    }
    debug(message, data) {
        if (this.shouldLog('debug')) {
            console.error(this.formatMessage('debug', message, data));
        }
    }
    info(message, data) {
        if (this.shouldLog('info')) {
            console.error(this.formatMessage('info', message, data));
        }
    }
    warn(message, data, error) {
        if (this.shouldLog('warn')) {
            console.error(this.formatMessage('warn', message, data, error));
        }
    }
    error(message, data, error) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, data, error));
        }
    }
}
// Create singleton logger instance
export const logger = new Logger(process.env.LOG_LEVEL || 'info');
// Update logger level if environment variable changes
if (process.env.LOG_LEVEL) {
    logger.setLevel(process.env.LOG_LEVEL);
}
//# sourceMappingURL=logger.js.map