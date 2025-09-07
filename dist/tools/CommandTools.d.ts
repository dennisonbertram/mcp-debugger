import type { MCPDebuggerConfig } from "../types/index.js";
export declare class CommandTools {
    private config;
    private activeCommands;
    constructor(config: MCPDebuggerConfig);
    registerTools(server: any): void;
    private handleRunCommand;
    private isCommandAllowed;
    private executeCommand;
    close(): Promise<void>;
}
//# sourceMappingURL=CommandTools.d.ts.map