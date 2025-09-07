declare const LOG_LEVELS: {
    readonly debug: 0;
    readonly info: 1;
    readonly warn: 2;
    readonly error: 3;
};
type LogLevel = keyof typeof LOG_LEVELS;
declare class Logger {
    private level;
    constructor(level?: LogLevel);
    setLevel(level: LogLevel): void;
    private shouldLog;
    private formatMessage;
    debug(message: string, data?: Record<string, any>): void;
    info(message: string, data?: Record<string, any>): void;
    warn(message: string, data?: Record<string, any>, error?: Error): void;
    error(message: string, data?: Record<string, any>, error?: Error): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map