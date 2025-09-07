import type { MCPDebuggerConfig } from "../types/index.js";
export declare class WorkspaceResources {
    private config;
    private git;
    constructor(config: MCPDebuggerConfig);
    registerResources(_server: any): void;
    private handleFileResource;
    private handleDiagnosticsResource;
    private handleGitStatusResource;
    private handleGitDiffResource;
    private handleFileListingResource;
    private validateAndResolvePath;
    private getMimeType;
    private generateDiagnostics;
    private listFiles;
    close(): Promise<void>;
}
//# sourceMappingURL=WorkspaceResources.d.ts.map