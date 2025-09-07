import { logger } from "../utils/logger.js";
import type { LogEntry, MCPResourceResult } from "../types/index.js";

export class LogResources {
  private logEntries: LogEntry[] = [];
  private maxEntries: number = 10000; // Keep last 10k entries

  constructor() {}

  registerResources(_server: any): void {
    logger.debug("Log resources registered (simplified for now)");
  }

  // Public methods for log management
  addLogEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: entry.level,
      source: entry.source,
      message: entry.message,
      ...(entry.data ? { data: entry.data } : {})
    };

    this.logEntries.push(logEntry);

    // Maintain max entries limit
    if (this.logEntries.length > this.maxEntries) {
      this.logEntries = this.logEntries.slice(-this.maxEntries);
    }

    // Also log to our internal logger for debugging
    logger.debug("Log entry added", {
      source: entry.source,
      level: entry.level,
      message: entry.message.substring(0, 100)
    });
  }

  getLogEntries(filter?: {
    level?: string;
    since?: Date;
    until?: Date;
    contains?: string;
    source?: string;
    limit?: number;
  }): LogEntry[] {
    let entries = [...this.logEntries];

    if (filter?.level) {
      entries = entries.filter(e => e.level === filter.level);
    }

    if (filter && filter.since) {
      const since = filter.since as Date;
      entries = entries.filter(e => e.timestamp >= since);
    }

    if (filter && filter.until) {
      const until = filter.until as Date;
      entries = entries.filter(e => e.timestamp <= until);
    }

    if (filter?.contains) {
      const searchTerm = filter.contains.toLowerCase();
      entries = entries.filter(e =>
        e.message.toLowerCase().includes(searchTerm) ||
        (e.data && JSON.stringify(e.data).toLowerCase().includes(searchTerm))
      );
    }

    if (filter?.source) {
      entries = entries.filter(e => e.source === filter.source);
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter?.limit) {
      entries = entries.slice(0, filter.limit);
    }

    return entries;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleAppLogsResource(
    uri: URL,
    params: Record<string, string>
  ): Promise<MCPResourceResult> {
    try {
      const filter = {
        ...(params.level ? { level: params.level } : {}),
        ...(params.since ? { since: new Date(params.since) } : {}),
        ...(params.until ? { until: new Date(params.until) } : {}),
        ...(params.contains ? { contains: params.contains } : {}),
        source: 'app',
        ...(params.limit ? { limit: parseInt(params.limit, 10) } : {})
      } as {
        level?: string; since?: Date; until?: Date; contains?: string; source?: string; limit?: number;
      };

      const entries = this.getLogEntries(filter);

      const logData = {
        total: entries.length,
        filter,
        entries: entries.map(entry => ({
          id: entry.id,
          timestamp: entry.timestamp.toISOString(),
          level: entry.level,
          source: entry.source,
          message: entry.message,
          data: entry.data
        }))
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(logData, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error handling app logs resource", { error, uri: uri.href, params });
      throw error;
    }
  }

  private async handleDebugLogsResource(
    uri: URL,
    params: Record<string, string>
  ): Promise<MCPResourceResult> {
    try {
      const sessionId = params.sessionId;
      if (!sessionId) {
        throw new Error("Missing required parameter: sessionId");
      }

      const filter = {
        ...(params.level ? { level: params.level } : {}),
        ...(params.since ? { since: new Date(params.since) } : {}),
        ...(params.until ? { until: new Date(params.until) } : {}),
        ...(params.contains ? { contains: params.contains } : {}),
        source: `debug:${sessionId}`,
        ...(params.limit ? { limit: parseInt(params.limit, 10) } : {})
      } as {
        level?: string; since?: Date; until?: Date; contains?: string; source?: string; limit?: number;
      };

      const entries = this.getLogEntries(filter);

      const logData = {
        sessionId,
        total: entries.length,
        filter,
        entries: entries.map(entry => ({
          id: entry.id,
          timestamp: entry.timestamp.toISOString(),
          level: entry.level,
          source: entry.source,
          message: entry.message,
          data: entry.data
        }))
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(logData, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error handling debug logs resource", { error, uri: uri.href, params });
      throw error;
    }
  }

  private async handleAllLogsResource(
    uri: URL,
    params: Record<string, string>
  ): Promise<MCPResourceResult> {
    try {
      const filter = {
        ...(params.level ? { level: params.level } : {}),
        ...(params.since ? { since: new Date(params.since) } : {}),
        ...(params.until ? { until: new Date(params.until) } : {}),
        ...(params.contains ? { contains: params.contains } : {}),
        ...(params.limit ? { limit: parseInt(params.limit, 10) } : {})
      } as {
        level?: string; since?: Date; until?: Date; contains?: string; source?: string; limit?: number;
      };

      const entries = this.getLogEntries(filter);

      // Group by source
      const groupedEntries = entries.reduce((groups, entry) => {
        const source = entry.source;
        if (!groups[source]) {
          groups[source] = [];
        }
        groups[source].push({
          id: entry.id,
          timestamp: entry.timestamp.toISOString(),
          level: entry.level,
          message: entry.message,
          data: entry.data
        });
        return groups;
      }, {} as Record<string, any[]>);

      const logData = {
        total: entries.length,
        filter,
        sources: Object.keys(groupedEntries),
        entries: groupedEntries
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(logData, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error handling all logs resource", { error, uri: uri.href, params });
      throw error;
    }
  }

  // Utility method to create structured log entries
  logDebugSessionEvent(sessionId: string, event: string, data?: Record<string, any>): void {
    this.addLogEntry({
      level: 'info',
      source: `debug:${sessionId}`,
      message: event,
      ...(data ? { data } : {})
    });
  }

  logTestEvent(testId: string, event: string, data?: Record<string, any>): void {
    this.addLogEntry({
      level: 'info',
      source: `test:${testId}`,
      message: event,
      ...(data ? { data } : {})
    });
  }

  logLintEvent(lintId: string, event: string, data?: Record<string, any>): void {
    this.addLogEntry({
      level: 'info',
      source: `lint:${lintId}`,
      message: event,
      ...(data ? { data } : {})
    });
  }

  logCommandEvent(commandId: string, event: string, data?: Record<string, any>): void {
    this.addLogEntry({
      level: 'info',
      source: `command:${commandId}`,
      message: event,
      ...(data ? { data } : {})
    });
  }

  async close(): Promise<void> {
    // Cleanup logs
    this.logEntries = [];
    logger.debug("Log resources closed");
  }
}
