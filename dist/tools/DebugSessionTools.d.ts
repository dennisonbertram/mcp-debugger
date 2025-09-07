import type { MCPDebuggerConfig } from "../types/index.js";
export declare class DebugSessionTools {
    private config;
    private activeProcesses;
    private debugResources?;
    private logResources?;
    constructor(config: MCPDebuggerConfig);
    setDependencies(debugResources: any, logResources: any): void;
    registerTools(server: any): void;
    private handleOpenDebugSession;
    private handleCloseDebugSession;
    private handleListDebugSessions;
    private startDebugProcess;
    getActiveSessionCount(): number;
    close(): Promise<void>;
}
//# sourceMappingURL=DebugSessionTools.d.ts.map