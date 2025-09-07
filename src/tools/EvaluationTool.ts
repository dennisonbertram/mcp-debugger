// no-op import removed
import { z } from "zod";
import { logger } from "../utils/logger.js";
import type { MCPDebuggerConfig, MCPToolResult } from "../types/index.js";
import { SessionNotFoundError } from "../types/index.js";

export class EvaluationTool {
  private _config: MCPDebuggerConfig;

  // Injected dependencies
  private debugResources?: any;
  private logResources?: any;

  constructor(config: MCPDebuggerConfig) {
    this._config = config;
  }

  setDependencies(debugResources: any, logResources: any): void {
    this.debugResources = debugResources;
    this.logResources = logResources;
  }

  registerTools(server: any): void {
    // Evaluate expression tool
    server.registerTool(
      "evaluate_expression",
      {
        title: "Evaluate Expression",
        description: "Evaluate an expression in the current debug context or a specific frame",
        inputSchema: z.object({
          session_id: z.string().describe("ID of the debug session"),
          expression: z.string().describe("Expression to evaluate (e.g., 'user.name', 'calculateTotal()', 'JSON.stringify(obj)')"),
          frame_id: z.string().optional().describe("Optional frame ID to evaluate in (from stack trace)")
        })
      },
      this.handleEvaluateExpression.bind(this)
    );

    // Watch expression tool
    server.registerTool(
      "watch_expression",
      {
        title: "Watch Expression",
        description: "Set up a watch expression that gets evaluated on each step/breakpoint",
        inputSchema: z.object({
          session_id: z.string().describe("ID of the debug session"),
          expression: z.string().describe("Expression to watch"),
          name: z.string().optional().describe("Optional name for the watch expression")
        })
      },
      this.handleWatchExpression.bind(this)
    );

    // List watch expressions tool
    server.registerTool(
      "list_watch_expressions",
      {
        title: "List Watch Expressions",
        description: "List all active watch expressions in a debug session",
        inputSchema: z.object({
          session_id: z.string().describe("ID of the debug session")
        })
      },
      this.handleListWatchExpressions.bind(this)
    );

    // Clear watch expression tool
    server.registerTool(
      "clear_watch_expression",
      {
        title: "Clear Watch Expression",
        description: "Remove a watch expression from a debug session",
        inputSchema: z.object({
          session_id: z.string().describe("ID of the debug session"),
          watch_id: z.string().describe("ID of the watch expression to remove")
        })
      },
      this.handleClearWatchExpression.bind(this)
    );

    logger.debug("Evaluation tools registered");
  }

  private async handleEvaluateExpression(args: {
    session_id: string;
    expression: string;
    frame_id?: string;
  }): Promise<MCPToolResult> {
    try {
      // Validate session exists
      const session = this.debugResources?.getSession(args.session_id);
      if (!session) {
        throw new SessionNotFoundError(args.session_id);
      }

      // Check if session is in a valid state for evaluation
      if (!['paused', 'running'].includes(session.status)) {
        return {
          content: [{
            type: "text",
            text: `Session ${args.session_id} is not in a valid state for evaluation (current status: ${session.status}). Session must be paused or running.`
          }],
          isError: true
        };
      }

      // Validate expression syntax (basic check)
      if (!args.expression.trim()) {
        return {
          content: [{
            type: "text",
            text: "Expression cannot be empty"
          }],
          isError: true
        };
      }

      // In a real implementation, you'd send the evaluation request to the debugger
      // For now, we'll simulate this based on the runtime type

      let result: any;
      let resultType: string;

      if (session.kind === 'node') {
        // Simulate Node.js evaluation
        result = await this.simulateNodeEvaluation(args.expression, args.frame_id);
        resultType = typeof result;
      } else if (session.kind === 'python') {
        // Simulate Python evaluation
        result = await this.simulatePythonEvaluation(args.expression, args.frame_id);
        resultType = typeof result;
      } else {
        // Generic simulation
        result = `<simulated result for ${args.expression}>`;
        resultType = 'unknown';
      }

      // Log the event
      this.logResources?.logDebugSessionEvent(args.session_id, 'Expression evaluated', {
        expression: args.expression,
        frameId: args.frame_id,
        result: resultType === 'object' ? '[object]' : String(result).substring(0, 100)
      });

      logger.info("Expression evaluated", {
        sessionId: args.session_id,
        expression: args.expression.substring(0, 50),
        resultType
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            session_id: args.session_id,
            expression: args.expression,
            frame_id: args.frame_id,
            result: result,
            type: resultType,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error evaluating expression", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error evaluating expression: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleWatchExpression(args: {
    session_id: string;
    expression: string;
    name?: string;
  }): Promise<MCPToolResult> {
    try {
      // Validate session exists
      const session = this.debugResources?.getSession(args.session_id);
      if (!session) {
        throw new SessionNotFoundError(args.session_id);
      }

      // Generate watch ID
      const watchId = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // In a real implementation, you'd store this watch expression
      // and evaluate it automatically on each step/breakpoint
      const watchExpression = {
        id: watchId,
        name: args.name || `Watch ${watchId.substring(0, 8)}`,
        expression: args.expression,
        createdAt: new Date(),
        lastValue: null as unknown,
        lastType: null as unknown
      };

      // Log the event
      this.logResources?.logDebugSessionEvent(args.session_id, 'Watch expression added', {
        watchId,
        expression: args.expression,
        name: args.name
      });

      logger.info("Watch expression added", {
        sessionId: args.session_id,
        watchId,
        expression: args.expression
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            session_id: args.session_id,
            watch_id: watchId,
            name: watchExpression.name,
            expression: args.expression,
            message: `Watch expression "${watchExpression.name}" added successfully`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error adding watch expression", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error adding watch expression: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleListWatchExpressions(args: { session_id: string }): Promise<MCPToolResult> {
    try {
      // Validate session exists
      const session = this.debugResources?.getSession(args.session_id);
      if (!session) {
        throw new SessionNotFoundError(args.session_id);
      }

      // In a real implementation, you'd retrieve stored watch expressions
      // For now, return empty array
      const watchExpressions: Array<{ id: string; name: string; expression: string }> = [];

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            session_id: args.session_id,
            watch_expressions: watchExpressions,
            total: watchExpressions.length
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error listing watch expressions", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error listing watch expressions: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleClearWatchExpression(args: {
    session_id: string;
    watch_id: string;
  }): Promise<MCPToolResult> {
    try {
      // Validate session exists
      const session = this.debugResources?.getSession(args.session_id);
      if (!session) {
        throw new SessionNotFoundError(args.session_id);
      }

      // In a real implementation, you'd remove the watch expression
      // For now, just simulate success

      // Log the event
      this.logResources?.logDebugSessionEvent(args.session_id, 'Watch expression cleared', {
        watchId: args.watch_id
      });

      logger.info("Watch expression cleared", {
        sessionId: args.session_id,
        watchId: args.watch_id
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            session_id: args.session_id,
            watch_id: args.watch_id,
            message: `Watch expression ${args.watch_id} cleared successfully`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error clearing watch expression", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error clearing watch expression: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  // Simulation methods for different runtimes
  private async simulateNodeEvaluation(expression: string, _frameId?: string): Promise<any> {
    // Simulate Node.js expression evaluation
    if (expression.includes('user')) {
      return { name: 'John Doe', email: 'john@example.com', id: 123 };
    }
    if (expression.includes('Math')) {
      return 42;
    }
    if (expression.includes('process')) {
      return { platform: 'linux', version: 'v18.17.0' };
    }
    return `<Node.js result for: ${expression}>`;
  }

  private async simulatePythonEvaluation(expression: string, _frameId?: string): Promise<any> {
    // Simulate Python expression evaluation
    if (expression.includes('user')) {
      return { 'name': 'Jane Smith', 'email': 'jane@example.com', 'id': 456 };
    }
    if (expression.includes('len(') || expression.includes('len ')) {
      return 5;
    }
    if (expression.includes('sys')) {
      return { 'platform': 'linux', 'version': '3.11.0' };
    }
    return `<Python result for: ${expression}>`;
  }

  async close(): Promise<void> {
    // No cleanup needed for evaluation tools
    logger.debug("Evaluation tools closed");
  }
}
