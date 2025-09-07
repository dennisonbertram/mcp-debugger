import { logger } from "../utils/logger.js";
import type { DebugSession, StackFrame, Variable, MCPResourceResult } from "../types/index.js";
import { SessionNotFoundError } from "../types/index.js";

export class DebugResources {
  private sessions: Map<string, DebugSession> = new Map();

  constructor() {}

  registerResources(_server: any): void {
    logger.debug("Debug resources registered (simplified for now)");
  }

  // Keep the session management methods for tools to use
  addSession(session: DebugSession): void {
    this.sessions.set(session.id, session);
    logger.debug("Debug session added", { sessionId: session.id, kind: session.kind });
  }

  updateSession(sessionId: string, updates: Partial<DebugSession>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    Object.assign(session, updates);
    session.lastActivity = new Date();
    logger.debug("Debug session updated", { sessionId, updates });
  }

  removeSession(sessionId: string): void {
    if (this.sessions.delete(sessionId)) {
      logger.debug("Debug session removed", { sessionId });
    }
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  async close(): Promise<void> {
    // Cleanup sessions
    this.sessions.clear();
    logger.debug("Debug resources closed");
  }
}
