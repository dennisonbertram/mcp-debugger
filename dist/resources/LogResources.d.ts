import type { LogEntry } from "../types/index.js";
export declare class LogResources {
    private logEntries;
    private maxEntries;
    constructor();
    registerResources(_server: any): void;
    addLogEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>): void;
    getLogEntries(filter?: {
        level?: string;
        since?: Date;
        until?: Date;
        contains?: string;
        source?: string;
        limit?: number;
    }): LogEntry[];
    private generateLogId;
    private handleAppLogsResource;
    private handleDebugLogsResource;
    private handleAllLogsResource;
    logDebugSessionEvent(sessionId: string, event: string, data?: Record<string, any>): void;
    logTestEvent(testId: string, event: string, data?: Record<string, any>): void;
    logLintEvent(lintId: string, event: string, data?: Record<string, any>): void;
    logCommandEvent(commandId: string, event: string, data?: Record<string, any>): void;
    close(): Promise<void>;
}
//# sourceMappingURL=LogResources.d.ts.map