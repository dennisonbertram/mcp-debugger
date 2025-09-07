// no-op import removed
import { z } from "zod";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { logger } from "../utils/logger.js";
// import removed: SessionAlreadyExistsError not used
export class DebugSessionTools {
    config;
    activeProcesses = new Map();
    // Injected dependencies (would be set by the main server)
    debugResources;
    logResources;
    constructor(config) {
        this.config = config;
    }
    // Method to inject dependencies
    setDependencies(debugResources, logResources) {
        this.debugResources = debugResources;
        this.logResources = logResources;
    }
    registerTools(server) {
        // Open debug session tool
        server.registerTool("open_debug_session", {
            title: "Open Debug Session",
            description: "Start a new debug session for a specific runtime and entry point",
            inputSchema: z.object({
                kind: z.enum(['node', 'python', 'go', 'java', 'csharp', 'cpp', 'php', 'ruby', 'rust']),
                entry: z.string().describe("Entry file path relative to workspace"),
                args: z.array(z.string()).optional().describe("Command line arguments"),
                env: z.record(z.string()).optional().describe("Environment variables"),
                cwd: z.string().optional().describe("Working directory (defaults to workspace)")
            })
        }, this.handleOpenDebugSession.bind(this));
        // Close debug session tool
        server.registerTool("close_debug_session", {
            title: "Close Debug Session",
            description: "Terminate a debug session",
            inputSchema: z.object({
                session_id: z.string().describe("ID of the debug session to close")
            })
        }, this.handleCloseDebugSession.bind(this));
        // List debug sessions tool
        server.registerTool("list_debug_sessions", {
            title: "List Debug Sessions",
            description: "List all active debug sessions",
            inputSchema: z.object({
                status: z.enum(['all', 'active', 'paused', 'stopped']).optional().default('all')
            })
        }, this.handleListDebugSessions.bind(this));
        logger.debug("Debug session tools registered");
    }
    async handleOpenDebugSession(args) {
        try {
            const sessionId = `dbg_${randomUUID()}`;
            // Validate entry point exists
            const workingDir = args.cwd || this.config.workspaceDir;
            const entryPath = path.resolve(workingDir, args.entry);
            try {
                await fs.access(entryPath);
            }
            catch {
                throw new Error(`Entry file not found: ${entryPath}`);
            }
            // Create debug session
            const session = {
                id: sessionId,
                kind: args.kind,
                cwd: workingDir,
                entryPoint: args.entry,
                args: args.args || [],
                env: args.env || {},
                status: 'starting',
                createdAt: new Date(),
                lastActivity: new Date(),
                breakpoints: [],
                threads: [],
                output: [],
                errorOutput: []
            };
            // Start the debug process
            const debugProcess = await this.startDebugProcess(session);
            // Store the session and process
            this.activeProcesses.set(sessionId, { process: debugProcess, session });
            // Register with debug resources
            if (this.debugResources) {
                this.debugResources.addSession(session);
            }
            // Log the event
            if (this.logResources) {
                this.logResources.logDebugSessionEvent(sessionId, 'Session opened', {
                    kind: args.kind,
                    entry: args.entry,
                    cwd: workingDir
                });
            }
            logger.info("Debug session opened", {
                sessionId,
                kind: args.kind,
                entry: args.entry,
                cwd: workingDir
            });
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            session_id: sessionId,
                            status: 'starting',
                            message: `Debug session started for ${args.kind} with entry ${args.entry}`
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error opening debug session", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error opening debug session: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async handleCloseDebugSession(args) {
        try {
            const sessionData = this.activeProcesses.get(args.session_id);
            if (!sessionData) {
                throw new Error(`Debug session not found: ${args.session_id}`);
            }
            const { process, session } = sessionData;
            // Terminate the process
            if (process && !process.killed) {
                process.kill('SIGTERM');
                // Wait for process to exit or force kill after timeout
                await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        if (!process.killed) {
                            process.kill('SIGKILL');
                        }
                        resolve();
                    }, 5000);
                    process.on('exit', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                });
            }
            // Update session status
            session.status = 'stopped';
            session.lastActivity = new Date();
            session.exitCode = process?.exitCode;
            // Update debug resources
            if (this.debugResources) {
                this.debugResources.updateSession(args.session_id, {
                    status: 'stopped',
                    exitCode: session.exitCode
                });
            }
            // Log the event
            if (this.logResources) {
                this.logResources.logDebugSessionEvent(args.session_id, 'Session closed', {
                    exitCode: session.exitCode
                });
            }
            // Clean up
            this.activeProcesses.delete(args.session_id);
            logger.info("Debug session closed", {
                sessionId: args.session_id,
                exitCode: session.exitCode
            });
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            session_id: args.session_id,
                            status: 'stopped',
                            exitCode: session.exitCode,
                            message: `Debug session closed successfully`
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error closing debug session", { error, sessionId: args.session_id });
            return {
                content: [{
                        type: "text",
                        text: `Error closing debug session: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async handleListDebugSessions(args) {
        try {
            const sessions = Array.from(this.activeProcesses.values())
                .map(({ session }) => session)
                .filter(session => {
                if (args.status === 'all' || !args.status)
                    return true;
                if (args.status === 'active')
                    return ['starting', 'running', 'paused'].includes(session.status);
                return session.status === args.status;
            })
                .map(session => ({
                id: session.id,
                kind: session.kind,
                status: session.status,
                entryPoint: session.entryPoint,
                createdAt: session.createdAt.toISOString(),
                lastActivity: session.lastActivity.toISOString(),
                threads: session.threads.length,
                breakpoints: session.breakpoints.length
            }));
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            sessions,
                            total: sessions.length,
                            filter: args.status || 'all'
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error listing debug sessions", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error listing debug sessions: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async startDebugProcess(session) {
        const { kind, cwd, entryPoint, args = [], env = {} } = session;
        // Build command based on runtime
        let command;
        let commandArgs;
        switch (kind) {
            case 'node':
                command = 'node';
                commandArgs = ['--inspect-brk', entryPoint, ...args];
                break;
            case 'python':
                command = 'python';
                commandArgs = ['-m', 'debugpy', '--wait-for-client', '--listen', '5678', entryPoint, ...args];
                break;
            case 'go':
                command = 'dlv';
                commandArgs = ['debug', entryPoint, '--headless', '--listen=:2345', '--api-version=2'];
                break;
            case 'java':
                command = 'java';
                commandArgs = ['-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005', '-cp', '.', entryPoint, ...args];
                break;
            case 'csharp':
                command = 'dotnet';
                commandArgs = ['run', '--launch-profile', 'Debug', ...args];
                break;
            case 'cpp':
                // For C++, we'd need a specific debugger setup
                throw new Error('C++ debugging not yet implemented');
            case 'php':
                command = 'php';
                commandArgs = [entryPoint, ...args];
                break;
            case 'ruby':
                command = 'ruby';
                commandArgs = [entryPoint, ...args];
                break;
            case 'rust':
                command = 'cargo';
                commandArgs = ['run', ...args];
                break;
            default:
                throw new Error(`Unsupported runtime: ${kind}`);
        }
        // Merge environment variables
        const processEnv = {
            ...process.env,
            ...env,
            PWD: cwd
        };
        return new Promise((resolve, reject) => {
            try {
                const childProcess = spawn(command, commandArgs, {
                    cwd,
                    env: processEnv,
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                let startupTimeout = setTimeout(() => {
                    childProcess.kill('SIGTERM');
                    reject(new Error(`Debug process startup timeout for ${kind}`));
                }, 10000);
                // Handle process output
                childProcess.stdout?.on('data', (data) => {
                    const output = data.toString();
                    session.output.push(output);
                    logger.debug("Debug process stdout", { sessionId: session.id, output: output.substring(0, 100) });
                });
                childProcess.stderr?.on('data', (data) => {
                    const errorOutput = data.toString();
                    session.errorOutput.push(errorOutput);
                    logger.debug("Debug process stderr", { sessionId: session.id, errorOutput: errorOutput.substring(0, 100) });
                });
                childProcess.on('error', (error) => {
                    clearTimeout(startupTimeout);
                    reject(error);
                });
                childProcess.on('exit', (code) => {
                    clearTimeout(startupTimeout);
                    session.status = 'stopped';
                    session.exitCode = code || 0;
                    logger.info("Debug process exited", { sessionId: session.id, exitCode: code });
                });
                // For some debuggers, we need to wait for the debugger to be ready
                setTimeout(() => {
                    clearTimeout(startupTimeout);
                    session.status = 'running';
                    resolve(childProcess);
                }, 2000);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    getActiveSessionCount() {
        return this.activeProcesses.size;
    }
    async close() {
        // Close all active processes
        const closePromises = Array.from(this.activeProcesses.entries()).map(async ([sessionId, { process, session }]) => {
            try {
                if (process && !process.killed) {
                    process.kill('SIGTERM');
                }
                // Update session status
                session.status = 'stopped';
                session.lastActivity = new Date();
                logger.debug("Closed debug session during shutdown", { sessionId });
            }
            catch (error) {
                logger.error("Error closing debug session during shutdown", { sessionId, error });
            }
        });
        await Promise.all(closePromises);
        this.activeProcesses.clear();
        logger.debug("Debug session tools closed");
    }
}
//# sourceMappingURL=DebugSessionTools.js.map