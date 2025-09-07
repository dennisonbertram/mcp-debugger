// no-op import removed
import { z } from "zod";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { logger } from "../utils/logger.js";
import type { MCPDebuggerConfig, Breakpoint, MCPToolResult } from "../types/index.js";
import { SessionNotFoundError, BreakpointNotFoundError } from "../types/index.js";

export class BreakpointTools {
  private config: MCPDebuggerConfig;

  // Injected dependencies
  private debugResources?: any;
  private logResources?: any;

  constructor(config: MCPDebuggerConfig) {
    this.config = config;
  }

  setDependencies(debugResources: any, logResources: any): void {
    this.debugResources = debugResources;
    this.logResources = logResources;
  }

  registerTools(server: any): void {
    // Set breakpoint tool
    server.registerTool(
      "set_breakpoint",
      {
        title: "Set Breakpoint",
        description: "Set a breakpoint in a debug session at a specific file and line",
        inputSchema: z.object({
          session_id: z.string().describe("ID of the debug session"),
          file: z.string().describe("File path relative to workspace"),
          line: z.number().int().positive().describe("Line number to break at"),
          condition: z.string().optional().describe("Optional condition expression")
        })
      },
      this.handleSetBreakpoint.bind(this)
    );

    // Clear breakpoint tool
    server.registerTool(
      "clear_breakpoint",
      {
        title: "Clear Breakpoint",
        description: "Remove a breakpoint from a debug session",
        inputSchema: z.object({
          session_id: z.string().describe("ID of the debug session"),
          breakpoint_id: z.string().describe("ID of the breakpoint to remove")
        })
      },
      this.handleClearBreakpoint.bind(this)
    );

    // List breakpoints tool
    server.registerTool(
      "list_breakpoints",
      {
        title: "List Breakpoints",
        description: "List all breakpoints in a debug session",
        inputSchema: z.object({
          session_id: z.string().describe("ID of the debug session"),
          enabled_only: z.boolean().optional().default(false).describe("Only show enabled breakpoints")
        })
      },
      this.handleListBreakpoints.bind(this)
    );

    // Enable/disable breakpoint tool
    server.registerTool(
      "toggle_breakpoint",
      {
        title: "Toggle Breakpoint",
        description: "Enable or disable a breakpoint",
        inputSchema: z.object({
          session_id: z.string().describe("ID of the debug session"),
          breakpoint_id: z.string().describe("ID of the breakpoint"),
          enabled: z.boolean().describe("Whether to enable or disable the breakpoint")
        })
      },
      this.handleToggleBreakpoint.bind(this)
    );

    logger.debug("Breakpoint tools registered");
  }

  private async handleSetBreakpoint(args: {
    session_id: string;
    file: string;
    line: number;
    condition?: string;
  }): Promise<MCPToolResult> {
    try {
      // Validate session exists
      const session = this.debugResources?.getSession(args.session_id);
      if (!session) {
        throw new SessionNotFoundError(args.session_id);
      }

      // Validate file exists and is within workspace
      const filePath = path.resolve(session.cwd, args.file);
      if (!filePath.startsWith(this.config.workspaceDir)) {
        throw new Error(`File path outside workspace: ${args.file}`);
      }

      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${args.file}`);
      }

      // Read file to validate line number
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      if (args.line > lines.length) {
        throw new Error(`Line number ${args.line} exceeds file length (${lines.length})`);
      }

      // Validate condition if provided (basic syntax check)
      if (args.condition) {
        try {
          // For now, just check if it's valid JavaScript
          new Function('return ' + args.condition);
        } catch {
          throw new Error(`Invalid condition expression: ${args.condition}`);
        }
      }

      // Create breakpoint
      const breakpoint: Breakpoint = {
        id: `bp_${randomUUID()}`,
        file: args.file,
        line: args.line,
        enabled: true,
        hitCount: 0,
        createdAt: new Date(),
        ...(args.condition !== undefined ? { condition: args.condition } : {})
      };

      // Add to session
      session.breakpoints.push(breakpoint);

      // Update debug resources
      this.debugResources?.updateSession(args.session_id, {
        breakpoints: session.breakpoints
      });

      // Log the event
      this.logResources?.logDebugSessionEvent(args.session_id, 'Breakpoint set', {
        breakpointId: breakpoint.id,
        file: args.file,
        line: args.line,
        condition: args.condition
      });

      logger.info("Breakpoint set", {
        sessionId: args.session_id,
        breakpointId: breakpoint.id,
        file: args.file,
        line: args.line
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            breakpoint_id: breakpoint.id,
            file: args.file,
            line: args.line,
            condition: args.condition,
            enabled: true,
            message: `Breakpoint set at ${args.file}:${args.line}`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error setting breakpoint", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error setting breakpoint: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleClearBreakpoint(args: {
    session_id: string;
    breakpoint_id: string;
  }): Promise<MCPToolResult> {
    try {
      // Validate session exists
      const session = this.debugResources?.getSession(args.session_id);
      if (!session) {
        throw new SessionNotFoundError(args.session_id);
      }

      // Find and remove breakpoint
      const breakpointIndex = session.breakpoints.findIndex((bp: Breakpoint) => bp.id === args.breakpoint_id);
      if (breakpointIndex === -1) {
        throw new BreakpointNotFoundError(args.breakpoint_id);
      }

      const breakpoint = session.breakpoints[breakpointIndex];
      session.breakpoints.splice(breakpointIndex, 1);

      // Update debug resources
      this.debugResources?.updateSession(args.session_id, {
        breakpoints: session.breakpoints
      });

      // Log the event
      this.logResources?.logDebugSessionEvent(args.session_id, 'Breakpoint cleared', {
        breakpointId: args.breakpoint_id,
        file: breakpoint.file,
        line: breakpoint.line
      });

      logger.info("Breakpoint cleared", {
        sessionId: args.session_id,
        breakpointId: args.breakpoint_id
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            breakpoint_id: args.breakpoint_id,
            file: breakpoint.file,
            line: breakpoint.line,
            message: `Breakpoint cleared from ${breakpoint.file}:${breakpoint.line}`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error clearing breakpoint", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error clearing breakpoint: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleListBreakpoints(args: {
    session_id: string;
    enabled_only?: boolean;
  }): Promise<MCPToolResult> {
    try {
      // Validate session exists
      const session = this.debugResources?.getSession(args.session_id);
      if (!session) {
        throw new SessionNotFoundError(args.session_id);
      }

      let breakpoints = session.breakpoints;

      if (args.enabled_only) {
        breakpoints = breakpoints.filter((bp: Breakpoint) => bp.enabled);
      }

      const breakpointData = breakpoints.map((bp: Breakpoint) => ({
        id: bp.id,
        file: bp.file,
        line: bp.line,
        condition: bp.condition,
        enabled: bp.enabled,
        hitCount: bp.hitCount,
        createdAt: bp.createdAt.toISOString()
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            session_id: args.session_id,
            breakpoints: breakpointData,
            total: breakpointData.length,
            enabled_only: args.enabled_only
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error listing breakpoints", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error listing breakpoints: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleToggleBreakpoint(args: {
    session_id: string;
    breakpoint_id: string;
    enabled: boolean;
  }): Promise<MCPToolResult> {
    try {
      // Validate session exists
      const session = this.debugResources?.getSession(args.session_id);
      if (!session) {
        throw new SessionNotFoundError(args.session_id);
      }

      // Find breakpoint
      const breakpoint = session.breakpoints.find((bp: Breakpoint) => bp.id === args.breakpoint_id);
      if (!breakpoint) {
        throw new BreakpointNotFoundError(args.breakpoint_id);
      }

      // Update breakpoint
      const oldState = breakpoint.enabled;
      breakpoint.enabled = args.enabled;

      // Update debug resources
      this.debugResources?.updateSession(args.session_id, {
        breakpoints: session.breakpoints
      });

      // Log the event
      this.logResources?.logDebugSessionEvent(args.session_id, 'Breakpoint toggled', {
        breakpointId: args.breakpoint_id,
        file: breakpoint.file,
        line: breakpoint.line,
        enabled: args.enabled,
        previousState: oldState
      });

      logger.info("Breakpoint toggled", {
        sessionId: args.session_id,
        breakpointId: args.breakpoint_id,
        enabled: args.enabled
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            breakpoint_id: args.breakpoint_id,
            file: breakpoint.file,
            line: breakpoint.line,
            enabled: args.enabled,
            message: `Breakpoint ${args.enabled ? 'enabled' : 'disabled'} at ${breakpoint.file}:${breakpoint.line}`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error toggling breakpoint", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error toggling breakpoint: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async close(): Promise<void> {
    // No cleanup needed for breakpoints
    logger.debug("Breakpoint tools closed");
  }
}
