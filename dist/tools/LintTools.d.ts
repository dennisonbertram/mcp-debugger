import type { MCPDebuggerConfig } from "../types/index.js";
export declare class LintTools {
    private config;
    private testResources?;
    private logResources?;
    constructor(config: MCPDebuggerConfig);
    setDependencies(testResources: any, logResources: any): void;
    registerTools(server: any): void;
    private handleRunLint;
    private buildLintCommand;
    private executeLintCommand;
    private parseLintOutput;
    close(): Promise<void>;
}
//# sourceMappingURL=LintTools.d.ts.map