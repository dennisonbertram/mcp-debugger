import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { logger } from "../utils/logger.js";
// Define MCP method schemas
const ListToolsRequestSchema = z.object({
    method: z.literal("tools/list"),
});
const CallToolRequestSchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
        name: z.string(),
        arguments: z.record(z.any()).optional(),
    }),
});
const ListResourcesRequestSchema = z.object({
    method: z.literal("resources/list"),
});
const ReadResourceRequestSchema = z.object({
    method: z.literal("resources/read"),
    params: z.object({
        uri: z.string(),
    }),
});
export class MCPDebuggerServer {
    server;
    config;
    constructor(config) {
        this.config = config;
        this.server = new Server({
            name: "mcp-debugger",
            version: "0.1.0",
        }, {
            capabilities: {
                tools: {},
                resources: {},
                logging: {},
            }
        });
        this.setupHandlers();
        logger.info("MCP Debugger Server initialized", {
            workspace: config.workspaceDir,
            allowPatches: config.allowFilePatches,
            allowCommands: config.allowCommandExecution
        });
    }
    setupHandlers() {
        // Tools list handler
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "echo",
                        description: "Echo back a message",
                        inputSchema: {
                            type: "object",
                            properties: {
                                message: { type: "string" }
                            },
                            required: ["message"]
                        }
                    },
                    {
                        name: "list_files",
                        description: "List files in the workspace",
                        inputSchema: {
                            type: "object",
                            properties: {
                                path: { type: "string" }
                            }
                        }
                    }
                ]
            };
        });
        // Tools call handler
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            switch (name) {
                case "echo":
                    return {
                        content: [{
                                type: "text",
                                text: `Echo: ${args?.message || "No message"}`
                            }]
                    };
                case "list_files":
                    // Simple file listing
                    const fs = await import("fs/promises");
                    const dirPath = args?.path || this.config.workspaceDir;
                    try {
                        const files = await fs.readdir(dirPath);
                        return {
                            content: [{
                                    type: "text",
                                    text: `Files in ${dirPath}:\n${files.join('\n')}`
                                }]
                        };
                    }
                    catch (error) {
                        return {
                            content: [{
                                    type: "text",
                                    text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`
                                }],
                            isError: true
                        };
                    }
                default:
                    return {
                        content: [{
                                type: "text",
                                text: `Unknown tool: ${name}`
                            }],
                        isError: true
                    };
            }
        });
        // Resources list handler
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return {
                resources: [
                    {
                        uri: "workspace://status",
                        name: "Workspace Status",
                        description: "Current workspace status and information"
                    }
                ]
            };
        });
        // Resources read handler
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const { uri } = request.params;
            if (uri === "workspace://status") {
                return {
                    contents: [{
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify({
                                workspace: this.config.workspaceDir,
                                timestamp: new Date().toISOString(),
                                features: {
                                    filePatches: this.config.allowFilePatches,
                                    commandExecution: this.config.allowCommandExecution
                                }
                            }, null, 2)
                        }]
                };
            }
            return {
                contents: [{
                        uri,
                        text: `Resource not found: ${uri}`
                    }]
            };
        });
    }
    async connect(transport) {
        try {
            await this.server.connect(transport);
            logger.info("MCP Debugger Server connected successfully");
        }
        catch (error) {
            logger.error("Failed to connect MCP Debugger Server", { error });
            throw error;
        }
    }
    async close() {
        try {
            if (this.server) {
                await this.server.close();
            }
            logger.info("MCP Debugger Server closed successfully");
        }
        catch (error) {
            logger.error("Error closing MCP Debugger Server", { error });
            throw error;
        }
    }
    // Health check method
    getHealthStatus() {
        const uptime = process.uptime();
        const status = 'healthy';
        return {
            status,
            uptime,
            config: {
                workspaceDir: this.config.workspaceDir,
                allowFilePatches: this.config.allowFilePatches,
                allowCommandExecution: this.config.allowCommandExecution,
                maxExecutionTimeMs: this.config.maxExecutionTimeMs,
                maxOutputBytes: this.config.maxOutputBytes,
            }
        };
    }
}
//# sourceMappingURL=MCPDebuggerServer.js.map