import type { MCPDebuggerConfig } from "../types/index.js";
export declare class EvaluationTool {
    private _config;
    private debugResources?;
    private logResources?;
    constructor(config: MCPDebuggerConfig);
    setDependencies(debugResources: any, logResources: any): void;
    registerTools(server: any): void;
    private handleEvaluateExpression;
    private handleWatchExpression;
    private handleListWatchExpressions;
    private handleClearWatchExpression;
    private simulateNodeEvaluation;
    private simulatePythonEvaluation;
    close(): Promise<void>;
}
//# sourceMappingURL=EvaluationTool.d.ts.map