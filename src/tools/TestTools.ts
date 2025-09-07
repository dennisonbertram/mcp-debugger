import { z } from "zod";
import { spawn } from "child_process";
import { logger } from "../utils/logger.js";
import type { MCPDebuggerConfig, TestReport, MCPToolResult } from "../types/index.js";

export class TestTools {
  private config: MCPDebuggerConfig;

  // Injected dependencies
  private testResources?: any;
  private logResources?: any;

  constructor(config: MCPDebuggerConfig) {
    this.config = config;
  }

  setDependencies(testResources: any, logResources: any): void {
    this.testResources = testResources;
    this.logResources = logResources;
  }

  registerTools(server: any): void {
    // Run tests tool
    server.registerTool(
      "run_tests",
      {
        title: "Run Tests",
        description: "Execute test suites and return results",
        inputSchema: z.object({
          runner: z.enum(['npm', 'yarn', 'jest', 'mocha', 'vitest', 'pytest', 'phpunit', 'rspec', 'go test']).default('npm'),
          target: z.string().optional().describe("Specific test file or pattern to run"),
          args: z.array(z.string()).optional().describe("Additional arguments for the test runner"),
          timeout_ms: z.number().int().optional().default(180000).describe("Timeout in milliseconds")
        })
      },
      this.handleRunTests.bind(this)
    );

    logger.debug("Test tools registered");
  }

  private async handleRunTests(args: {
    runner: string;
    target?: string;
    args?: string[];
    timeout_ms?: number;
  }): Promise<MCPToolResult> {
    try {
      const reportId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = new Date();

      // Create test report
      const report: TestReport = {
        id: reportId,
        runner: args.runner,
        status: 'running',
        startTime,
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
        failures: [],
        output: '',
        errorOutput: '',
        ...(args.target !== undefined ? { target: args.target } : {})
      };

      // Store the report
      this.testResources?.addTestReport(report);

      // Log the event
      this.logResources?.logTestEvent(reportId, 'Test execution started', {
        runner: args.runner,
        target: args.target
      });

      logger.info("Test execution started", {
        reportId,
        runner: args.runner,
        target: args.target
      });

      try {
        // Build command based on runner
        const { command, commandArgs } = this.buildTestCommand(args);

        // Execute the test command
        const result = await this.executeTestCommand(command, commandArgs, args.timeout_ms || 180000);

        // Update report with results
        const endTime = new Date();
        report.status = result.exitCode === 0 ? 'completed' : 'failed';
        report.endTime = endTime;
        report.output = result.stdout;
        report.errorOutput = result.stderr;

        // Parse test results (basic parsing - would be more sophisticated in real implementation)
        const summary = this.parseTestOutput(result.stdout, args.runner);
        report.summary = summary;

        // Extract failures
        report.failures = this.extractTestFailures(result.stdout, result.stderr, args.runner);

        // Update the stored report
        this.testResources?.addTestReport(report);

        // Log completion
        this.logResources?.logTestEvent(reportId, 'Test execution completed', {
          exitCode: result.exitCode,
          summary: report.summary
        });

        logger.info("Test execution completed", {
          reportId,
          exitCode: result.exitCode,
          summary: report.summary
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              report_id: reportId,
              status: report.status,
              summary: report.summary,
              failures: report.failures.slice(0, 10), // Limit failures in response
              duration: endTime.getTime() - startTime.getTime(),
              output_length: result.stdout.length,
              error_length: result.stderr.length
            }, null, 2)
          }]
        };
      } catch (error) {
        // Update report with error
        report.status = 'failed';
        report.endTime = new Date();
        report.errorOutput = error instanceof Error ? error.message : String(error);

        this.testResources?.addTestReport(report);

        this.logResources?.logTestEvent(reportId, 'Test execution failed', {
          error: error instanceof Error ? error.message : String(error)
        });

        return {
          content: [{
            type: "text",
            text: `Error running tests: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    } catch (error) {
      logger.error("Error in test execution", { error, args });
      return {
        content: [{
          type: "text",
          text: `Error executing tests: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private buildTestCommand(args: {
    runner: string;
    target?: string;
    args?: string[];
  }): { command: string; commandArgs: string[] } {
    const { runner, target, args: extraArgs = [] } = args;

    switch (runner) {
      case 'npm':
      case 'yarn':
        return {
          command: runner,
          commandArgs: ['test', ...(target ? [target] : []), ...extraArgs]
        };

      case 'jest':
        return {
          command: 'npx',
          commandArgs: ['jest', ...(target ? [target] : []), ...extraArgs]
        };

      case 'mocha':
        return {
          command: 'npx',
          commandArgs: ['mocha', ...(target ? [target] : []), ...extraArgs]
        };

      case 'vitest':
        return {
          command: 'npx',
          commandArgs: ['vitest', 'run', ...(target ? [target] : []), ...extraArgs]
        };

      case 'pytest':
        return {
          command: 'python',
          commandArgs: ['-m', 'pytest', ...(target ? [target] : []), ...extraArgs]
        };

      case 'phpunit':
        return {
          command: 'vendor/bin/phpunit',
          commandArgs: [...(target ? [target] : []), ...extraArgs]
        };

      case 'rspec':
        return {
          command: 'bundle',
          commandArgs: ['exec', 'rspec', ...(target ? [target] : []), ...extraArgs]
        };

      case 'go test':
        return {
          command: 'go',
          commandArgs: ['test', ...(target ? ['-run', target] : []), ...extraArgs]
        };

      default:
        throw new Error(`Unsupported test runner: ${runner}`);
    }
  }

  private async executeTestCommand(
    command: string,
    args: string[],
    timeout: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: this.config.workspaceDir,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
        reject(new Error(`Test execution timed out after ${timeout}ms`));
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
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

  private parseTestOutput(output: string, runner: string): { total: number; passed: number; failed: number; skipped: number; duration: number } {
    // Basic parsing - would be more sophisticated in real implementation
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };

    // Simple regex patterns for common test output formats
    const patterns = {
      jest: /Tests?:\s*(\d+).*?Passed:\s*(\d+).*?Failed:\s*(\d+)/i,
      mocha: /(\d+)\s*passing.*?(\d+)\s*failing/i,
      pytest: /(\d+)\s*passed.*?(\d+)\s*failed/i,
      phpunit: /Tests:\s*(\d+).*?Failures:\s*(\d+)/i
    } as const;

    const pattern = patterns[runner as keyof typeof patterns];
    if (pattern) {
      const match = output.match(pattern);
      if (match) {
        switch (runner) {
          case 'jest':
            summary.total = parseInt(match[1]);
            summary.passed = parseInt(match[2]);
            summary.failed = parseInt(match[3]);
            break;
          case 'mocha':
            summary.passed = parseInt(match[1]);
            summary.failed = parseInt(match[2]);
            summary.total = summary.passed + summary.failed;
            break;
          case 'pytest':
            summary.passed = parseInt(match[1]);
            summary.failed = parseInt(match[2]);
            summary.total = summary.passed + summary.failed;
            break;
          case 'phpunit':
            summary.total = parseInt(match[1]);
            summary.failed = parseInt(match[2]);
            summary.passed = summary.total - summary.failed;
            break;
        }
      }
    }

    return summary;
  }

  private extractTestFailures(stdout: string, stderr: string, _runner: string): Array<{
    test: string;
    file?: string;
    line?: number;
    message: string;
    stackTrace?: string;
  }> {
    // Basic failure extraction - would be more sophisticated in real implementation
    const failures: Array<{ test: string; file?: string; line?: number; message: string; stackTrace?: string; }> = [];

    // Simple pattern matching for common failure formats
    const lines = (stdout + '\n' + stderr).split('\n');
    let currentFailure: any = null;

    for (const line of lines) {
      if (line.includes('FAILED') || line.includes('Error:') || line.includes('failed')) {
        if (currentFailure) {
          failures.push(currentFailure);
        }
        currentFailure = {
          test: line.trim(),
          message: line.trim()
        };
      } else if (currentFailure && line.includes('at ')) {
        currentFailure.stackTrace = (currentFailure.stackTrace || '') + line + '\n';
      }
    }

    if (currentFailure) {
      failures.push(currentFailure);
    }

    return failures;
  }

  async close(): Promise<void> {
    // No cleanup needed for test tools
    logger.debug("Test tools closed");
  }
}
