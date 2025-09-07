import type { MCPDebuggerConfig } from "../types/index.js";
export declare class TestTools {
    private config;
    private testResources?;
    private logResources?;
    constructor(config: MCPDebuggerConfig);
    setDependencies(testResources: any, logResources: any): void;
    registerTools(server: any): void;
    private handleRunTests;
    private buildTestCommand;
    private executeTestCommand;
    private parseTestOutput;
    private extractTestFailures;
    close(): Promise<void>;
}
//# sourceMappingURL=TestTools.d.ts.map