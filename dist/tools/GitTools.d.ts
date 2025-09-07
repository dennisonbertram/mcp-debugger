import type { MCPDebuggerConfig } from "../types/index.js";
export declare class GitTools {
    private _config;
    private git;
    constructor(config: MCPDebuggerConfig);
    registerTools(server: any): void;
    private handleGitStatus;
    private handleGitDiff;
    private handleGitCommit;
    close(): Promise<void>;
}
//# sourceMappingURL=GitTools.d.ts.map