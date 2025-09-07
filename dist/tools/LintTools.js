// no-op import removed
import { z } from "zod";
import { spawn } from "child_process";
import { logger } from "../utils/logger.js";
export class LintTools {
    config;
    // Injected dependencies
    testResources;
    logResources;
    constructor(config) {
        this.config = config;
    }
    setDependencies(testResources, logResources) {
        this.testResources = testResources;
        this.logResources = logResources;
    }
    registerTools(server) {
        // Run lint tool
        server.registerTool("run_lint", {
            title: "Run Linting",
            description: "Execute code quality and style checks",
            inputSchema: z.object({
                tool: z.enum(['eslint', 'tsc', 'pylint', 'flake8', 'checkstyle', 'golint', 'clippy']).default('eslint'),
                paths: z.array(z.string()).optional().describe("Specific files or directories to lint"),
                args: z.array(z.string()).optional().describe("Additional arguments for the linter"),
                timeout_ms: z.number().int().optional().default(60000).describe("Timeout in milliseconds")
            })
        }, this.handleRunLint.bind(this));
        logger.debug("Lint tools registered");
    }
    async handleRunLint(args) {
        try {
            const reportId = `lint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const startTime = new Date();
            // Create lint report
            const report = {
                id: reportId,
                tool: args.tool,
                paths: args.paths || ['.'],
                status: 'running',
                startTime,
                issues: [],
                output: '',
                errorOutput: ''
            };
            // Store the report
            this.testResources?.addLintReport(report);
            // Log the event
            this.logResources?.logLintEvent(reportId, 'Lint execution started', {
                tool: args.tool,
                paths: args.paths
            });
            logger.info("Lint execution started", {
                reportId,
                tool: args.tool,
                paths: args.paths
            });
            try {
                // Build command based on tool
                const { command, commandArgs } = this.buildLintCommand(args);
                // Execute the lint command
                const result = await this.executeLintCommand(command, commandArgs, args.timeout_ms || 60000);
                // Update report with results
                const endTime = new Date();
                report.status = result.exitCode === 0 ? 'completed' : 'failed';
                report.endTime = endTime;
                report.output = result.stdout;
                report.errorOutput = result.stderr;
                // Parse lint issues
                report.issues = this.parseLintOutput(result.stdout, result.stderr, args.tool);
                // Update the stored report
                this.testResources?.addLintReport(report);
                // Log completion
                this.logResources?.logLintEvent(reportId, 'Lint execution completed', {
                    exitCode: result.exitCode,
                    issueCount: report.issues.length
                });
                logger.info("Lint execution completed", {
                    reportId,
                    exitCode: result.exitCode,
                    issueCount: report.issues.length
                });
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                report_id: reportId,
                                status: report.status,
                                tool: args.tool,
                                issues: report.issues.slice(0, 20), // Limit issues in response
                                duration: endTime.getTime() - startTime.getTime(),
                                output_length: result.stdout.length,
                                error_length: result.stderr.length
                            }, null, 2)
                        }]
                };
            }
            catch (error) {
                // Update report with error
                report.status = 'failed';
                report.endTime = new Date();
                report.errorOutput = error instanceof Error ? error.message : String(error);
                this.testResources?.addLintReport(report);
                this.logResources?.logLintEvent(reportId, 'Lint execution failed', {
                    error: error instanceof Error ? error.message : String(error)
                });
                return {
                    content: [{
                            type: "text",
                            text: `Error running linter: ${error instanceof Error ? error.message : String(error)}`
                        }],
                    isError: true
                };
            }
        }
        catch (error) {
            logger.error("Error in lint execution", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error executing linter: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    buildLintCommand(args) {
        const { tool, paths = ['.'], args: extraArgs = [] } = args;
        switch (tool) {
            case 'eslint':
                return {
                    command: 'npx',
                    commandArgs: ['eslint', ...paths, ...extraArgs]
                };
            case 'tsc':
                return {
                    command: 'npx',
                    commandArgs: ['tsc', '--noEmit', ...extraArgs]
                };
            case 'pylint':
                return {
                    command: 'python',
                    commandArgs: ['-m', 'pylint', ...paths, ...extraArgs]
                };
            case 'flake8':
                return {
                    command: 'python',
                    commandArgs: ['-m', 'flake8', ...paths, ...extraArgs]
                };
            case 'checkstyle':
                return {
                    command: 'java',
                    commandArgs: ['-jar', 'checkstyle.jar', '-c', 'checkstyle.xml', ...paths, ...extraArgs]
                };
            case 'golint':
                return {
                    command: 'golint',
                    commandArgs: [...paths, ...extraArgs]
                };
            case 'clippy':
                return {
                    command: 'cargo',
                    commandArgs: ['clippy', ...extraArgs]
                };
            default:
                throw new Error(`Unsupported lint tool: ${tool}`);
        }
    }
    async executeLintCommand(command, args, timeout) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd: this.config.workspaceDir,
                env: process.env,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            let stdout = '';
            let stderr = '';
            const timeoutHandle = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Lint execution timed out after ${timeout}ms`));
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
    parseLintOutput(stdout, stderr, _tool) {
        const issues = [];
        const output = stdout + '\n' + stderr;
        // Basic parsing for common linter output formats
        const lines = output.split('\n');
        for (const line of lines) {
            // ESLint format: file:line:column: level message (rule)
            const eslintMatch = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning|info)\s+(.+?)(?:\s*\((.+?)\))?$/);
            if (eslintMatch) {
                issues.push({
                    file: eslintMatch[1],
                    line: parseInt(eslintMatch[2]),
                    column: parseInt(eslintMatch[3]),
                    severity: eslintMatch[4],
                    message: eslintMatch[5],
                    rule: eslintMatch[6]
                });
                continue;
            }
            // TypeScript format: file(line,column): error TS#### message
            const tsMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning|info)\s+TS(\d+)\s+(.+)$/);
            if (tsMatch) {
                issues.push({
                    file: tsMatch[1],
                    line: parseInt(tsMatch[2]),
                    column: parseInt(tsMatch[3]),
                    severity: tsMatch[4],
                    message: tsMatch[6],
                    code: `TS${tsMatch[5]}`
                });
                continue;
            }
            // Python format: file:line: code message
            const pyMatch = line.match(/^(.+?):(\d+):\s*(.+?)\s+(.+)$/);
            if (pyMatch) {
                issues.push({
                    file: pyMatch[1],
                    line: parseInt(pyMatch[2]),
                    severity: (pyMatch[3].includes('error') ? 'error' : (pyMatch[3].includes('warning') ? 'warning' : 'info')),
                    message: pyMatch[4],
                    code: pyMatch[3]
                });
            }
        }
        return issues;
    }
    async close() {
        logger.debug("Lint tools closed");
    }
}
//# sourceMappingURL=LintTools.js.map