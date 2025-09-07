import type { DebugSession } from "../types/index.js";
export declare class DebugResources {
    private sessions;
    constructor();
    registerResources(_server: any): void;
    addSession(session: DebugSession): void;
    updateSession(sessionId: string, updates: Partial<DebugSession>): void;
    removeSession(sessionId: string): void;
    getSession(sessionId: string): DebugSession | undefined;
    getAllSessions(): DebugSession[];
    close(): Promise<void>;
}
//# sourceMappingURL=DebugResources.d.ts.map