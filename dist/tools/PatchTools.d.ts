import type { MCPDebuggerConfig } from "../types/index.js";
export declare class PatchTools {
    private config;
    private pendingPatches;
    constructor(config: MCPDebuggerConfig);
    registerTools(server: any): void;
    private handleApplyPatch;
    private applyPatch;
    confirmPatch(patchId: string, confirmedBy: string): Promise<boolean>;
    rejectPatch(patchId: string): boolean;
    close(): Promise<void>;
}
//# sourceMappingURL=PatchTools.d.ts.map