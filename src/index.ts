#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "./utils/logger.js";
import { MCPDebuggerServer } from "./core/MCPDebuggerServer.js";

// Environment variable parsing (simple version)
const env = {
  WORKSPACE_DIR: process.env.WORKSPACE_DIR || process.cwd(),
  ALLOW_FILE_PATCHES: process.env.ALLOW_FILE_PATCHES === 'true',
  ALLOW_COMMAND_EXECUTION: process.env.ALLOW_COMMAND_EXECUTION === 'true',
  MAX_EXECUTION_TIME_MS: parseInt(process.env.MAX_EXECUTION_TIME_MS || '30000'),
  MAX_OUTPUT_BYTES: parseInt(process.env.MAX_OUTPUT_BYTES || '1048576'),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

async function main() {
  logger.info("Starting MCP Debugger Server", {
    version: "0.1.0",
    workspace: env.WORKSPACE_DIR,
    allowPatches: env.ALLOW_FILE_PATCHES,
    allowCommands: env.ALLOW_COMMAND_EXECUTION
  });

  try {
    // Create the MCP debugger server instance
    const server = new MCPDebuggerServer({
      workspaceDir: env.WORKSPACE_DIR,
      allowFilePatches: env.ALLOW_FILE_PATCHES,
      allowCommandExecution: env.ALLOW_COMMAND_EXECUTION,
      maxExecutionTimeMs: env.MAX_EXECUTION_TIME_MS,
      maxOutputBytes: env.MAX_OUTPUT_BYTES,
      maxFileSizeBytes: 10 * 1024 * 1024,
    });

    // Create and connect the transport
    const transport = new StdioServerTransport();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await server.close();
      process.exit(0);
    });

    // Connect the server
    await server.connect(transport);
    logger.info("MCP Debugger Server connected and ready to accept requests");

  } catch (error) {
    logger.error("Failed to start MCP Debugger Server", { error });
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception", { error });
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error("Unhandled rejection", { reason, promise });
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    logger.error("Main function failed", { error });
    console.error("Main failed:", error);
    process.exit(1);
  });
}
