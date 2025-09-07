import type { MCPDebuggerConfig } from "../types/index.js";
export declare class ExecutionTools {
    private _config;
    private debugResources?;
    private logResources?;
    constructor(config: MCPDebuggerConfig);
    setDependencies(debugResources: any, logResources: any): void;
    registerTools(server: any): void;
    private handleContinue;
    private handleStepInto;
    private handleStepOver;
    private handleStepOut;
    private handlePause;
    close(): Promise<void>;
}
//# sourceMappingURL=ExecutionTools.d.ts.map