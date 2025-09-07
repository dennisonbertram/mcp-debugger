// no-op import removed
import { z } from "zod";
import { spawn } from "child_process";
import { logger } from "../utils/logger.js";
import { config } from "../utils/config.js";
import type { MCPDebuggerConfig, CommandExecution, MCPToolResult } from "../types/index.js";

export class CommandTools {
  private config: MCPDebuggerConfig;
  private activeCommands: Map<string, CommandExecution> = new Map();

  constructor(config: MCPDebuggerConfig) {
    this.config = config;
  }

  registerTools(server: any): void {
    if (!this.config.allowCommandExecution) {
      logger.warn("Command execution is disabled in configuration");
      return;
    }

    // Run command tool
    server.registerTool(
      "run_command",
      {
        title: "Run Command",
        description: "Execute a whitelisted system command",
        inputSchema: z.object({
          command: z.string().describe("Command to execute"),
          args: z.array(z.string()).optional().describe("Command arguments"),
          cwd: z.string().optional().describe("Working directory"),
          timeout_ms: z.number().int().optional().default(30000).describe("Timeout in milliseconds")
        })
      },
      this.handleRunCommand.bind(this)
    );

    logger.debug("Command tools registered");
  }

  private async handleRunCommand(args: {
    command: string;
    args?: string[];
    cwd?: string;
    timeout_ms?: number;
  }): Promise<MCPToolResult> {
    try {
      if (!this.config.allowCommandExecution) {
        return {
          content: [{
            type: "text",
            text: "Command execution is disabled in server configuration"
          }],
          isError: true
        };
      }

      // Validate command is allowed
      const fullCommand = [args.command, ...(args.args || [])].join(' ');
      if (!this.isCommandAllowed(args.command)) {
        logger.warn("Command not allowed", { command: args.command, fullCommand });
        return {
          content: [{
            type: "text",
            text: `Command not allowed: ${args.command}`
          }],
          isError: true
        };
      }

      const executionId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = new Date();

      // Create command execution record
      const execution: CommandExecution = {
        id: executionId,
        command: args.command,
        args: args.args || [],
        cwd: args.cwd || this.config.workspaceDir,
        status: 'running',
        startTime,
        output: '',
        errorOutput: ''
      };

      this.activeCommands.set(executionId, execution);

      logger.info("Command execution started", {
        executionId,
        command: args.command,
        args: args.args,
        cwd: execution.cwd
      });

      try {
        // Execute the command
        const result = await this.executeCommand(execution, args.timeout_ms || 30000);

        // Update execution record
        execution.status = result.exitCode === 0 ? 'completed' : 'failed';
        execution.endTime = new Date();
        execution.exitCode = result.exitCode;
        execution.output = result.stdout;
        execution.errorOutput = result.stderr;

        this.activeCommands.set(executionId, execution);

        logger.info("Command execution completed", {
          executionId,
          exitCode: result.exitCode,
          duration: execution.endTime.getTime() - startTime.getTime()
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              execution_id: executionId,
              command: args.command,
              args: args.args,
              exit_code: result.exitCode,
              status: execution.status,
              duration: execution.endTime.getTime() - startTime.getTime(),
              output_length: result.stdout.length,
              error_length: result.stderr.length,
              stdout: result.stdout.slice(0, 1000), // Truncate for response
              stderr: result.stderr.slice(0, 1000)
            }, null, 2)
          }]
        };
      } catch (error) {
        // Update execution record with error
        execution.status = 'failed';
        execution.endTime = new Date();
        execution.errorOutput = error instanceof Error ? error.message : String(error);

        this.activeCommands.set(executionId, execution);

        return {
          content: [{
            type: "text",
            text: `Error executing command: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    } catch (error) {
      logger.error("Error in command execution", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error executing command: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private isCommandAllowed(command: string): boolean {
    const allowedCommands: string[] = this.config.allowedCommands || (config.allowedCommands as unknown as string[]);
    return allowedCommands.some((c) => c === command);
  }

  private async executeCommand(
    execution: CommandExecution,
    timeout: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(execution.command, execution.args, {
        cwd: execution.cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        execution.status = 'timeout';
        reject(new Error(`Command execution timed out after ${timeout}ms`));
      }, timeout);

      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        execution.output += chunk;
      });

      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        execution.errorOutput += chunk;
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });

      child.on('exit', (code) => {
        clearTimeout(timeoutHandle);
        resolve({
          exitCode: code || 0,
          stdout: stdout.slice(-this.config.maxOutputBytes),
          stderr: stderr.slice(-this.config.maxOutputBytes)
        });
      });
    });
  }

  async close(): Promise<void> {
    // Terminate any active commands
    for (const [executionId, execution] of this.activeCommands) {
      if (execution.status === 'running') {
        // In a real implementation, we'd track the actual child process
        // and terminate it here
        execution.status = 'cancelled';
        logger.debug("Cancelled active command during shutdown", { executionId });
      }
    }
    this.activeCommands.clear();
    logger.debug("Command tools closed");
  }
}
