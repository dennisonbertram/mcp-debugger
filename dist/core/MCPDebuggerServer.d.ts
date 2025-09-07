import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { MCPDebuggerConfig } from "../types/index.js";
export declare class MCPDebuggerServer {
    private server;
    private config;
    constructor(config: MCPDebuggerConfig);
    private setupHandlers;
    connect(transport: StdioServerTransport): Promise<void>;
    close(): Promise<void>;
    getHealthStatus(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        uptime: number;
        config: Partial<MCPDebuggerConfig>;
    };
}
//# sourceMappingURL=MCPDebuggerServer.d.ts.map