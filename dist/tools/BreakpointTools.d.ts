import type { MCPDebuggerConfig } from "../types/index.js";
export declare class BreakpointTools {
    private config;
    private debugResources?;
    private logResources?;
    constructor(config: MCPDebuggerConfig);
    setDependencies(debugResources: any, logResources: any): void;
    registerTools(server: any): void;
    private handleSetBreakpoint;
    private handleClearBreakpoint;
    private handleListBreakpoints;
    private handleToggleBreakpoint;
    close(): Promise<void>;
}
//# sourceMappingURL=BreakpointTools.d.ts.map