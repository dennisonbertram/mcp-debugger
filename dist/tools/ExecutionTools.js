// no-op import removed
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { SessionNotFoundError } from "../types/index.js";
export class ExecutionTools {
    _config;
    // Injected dependencies
    debugResources;
    logResources;
    constructor(config) {
        this._config = config;
    }
    setDependencies(debugResources, logResources) {
        this.debugResources = debugResources;
        this.logResources = logResources;
    }
    registerTools(server) {
        // Continue execution tool
        server.registerTool("continue_execution", {
            title: "Continue Execution",
            description: "Continue execution from the current breakpoint",
            inputSchema: z.object({
                session_id: z.string().describe("ID of the debug session")
            })
        }, this.handleContinue.bind(this));
        // Step into tool
        server.registerTool("step_into", {
            title: "Step Into",
            description: "Step into the current function call",
            inputSchema: z.object({
                session_id: z.string().describe("ID of the debug session")
            })
        }, this.handleStepInto.bind(this));
        // Step over tool
        server.registerTool("step_over", {
            title: "Step Over",
            description: "Step over the current function call",
            inputSchema: z.object({
                session_id: z.string().describe("ID of the debug session")
            })
        }, this.handleStepOver.bind(this));
        // Step out tool
        server.registerTool("step_out", {
            title: "Step Out",
            description: "Step out of the current function",
            inputSchema: z.object({
                session_id: z.string().describe("ID of the debug session")
            })
        }, this.handleStepOut.bind(this));
        // Pause execution tool
        server.registerTool("pause_execution", {
            title: "Pause Execution",
            description: "Pause the currently running debug session",
            inputSchema: z.object({
                session_id: z.string().describe("ID of the debug session")
            })
        }, this.handlePause.bind(this));
        logger.debug("Execution tools registered");
    }
    async handleContinue(args) {
        try {
            // Validate session exists
            const session = this.debugResources?.getSession(args.session_id);
            if (!session) {
                throw new SessionNotFoundError(args.session_id);
            }
            // Check if session is in a paused state
            if (session.status !== 'paused') {
                return {
                    content: [{
                            type: "text",
                            text: `Session ${args.session_id} is not paused (current status: ${session.status}). Can only continue from paused state.`
                        }],
                    isError: true
                };
            }
            // Update session status
            this.debugResources?.updateSession(args.session_id, {
                status: 'running'
            });
            // In a real implementation, you'd send the continue command to the debugger
            // For now, we'll simulate this by updating the status
            // Log the event
            this.logResources?.logDebugSessionEvent(args.session_id, 'Execution continued');
            logger.info("Execution continued", { sessionId: args.session_id });
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            session_id: args.session_id,
                            action: 'continue',
                            status: 'running',
                            message: 'Execution continued from breakpoint'
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error continuing execution", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error continuing execution: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async handleStepInto(args) {
        try {
            // Validate session exists
            const session = this.debugResources?.getSession(args.session_id);
            if (!session) {
                throw new SessionNotFoundError(args.session_id);
            }
            // Check if session is in a paused state
            if (session.status !== 'paused') {
                return {
                    content: [{
                            type: "text",
                            text: `Session ${args.session_id} is not paused (current status: ${session.status}). Can only step from paused state.`
                        }],
                    isError: true
                };
            }
            // Update session status to running (briefly) then back to paused
            // In a real implementation, the debugger would handle this
            this.debugResources?.updateSession(args.session_id, {
                status: 'running'
            });
            // Simulate stepping (in a real implementation, this would be handled by the debugger)
            setTimeout(() => {
                this.debugResources?.updateSession(args.session_id, {
                    status: 'paused'
                });
                // Update current frame (simulated)
                const currentFrame = session.currentFrame;
                if (currentFrame) {
                    currentFrame.line += 1; // Simulate moving to next line
                    this.debugResources?.updateSession(args.session_id, {
                        currentFrame
                    });
                }
            }, 100);
            // Log the event
            this.logResources?.logDebugSessionEvent(args.session_id, 'Step into executed');
            logger.info("Step into executed", { sessionId: args.session_id });
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            session_id: args.session_id,
                            action: 'step_into',
                            status: 'stepping',
                            message: 'Stepped into function call'
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error stepping into", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error stepping into: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async handleStepOver(args) {
        try {
            // Validate session exists
            const session = this.debugResources?.getSession(args.session_id);
            if (!session) {
                throw new SessionNotFoundError(args.session_id);
            }
            // Check if session is in a paused state
            if (session.status !== 'paused') {
                return {
                    content: [{
                            type: "text",
                            text: `Session ${args.session_id} is not paused (current status: ${session.status}). Can only step from paused state.`
                        }],
                    isError: true
                };
            }
            // Update session status
            this.debugResources?.updateSession(args.session_id, {
                status: 'running'
            });
            // Simulate stepping over (in a real implementation, this would be handled by the debugger)
            setTimeout(() => {
                this.debugResources?.updateSession(args.session_id, {
                    status: 'paused'
                });
                // Update current frame (simulated)
                const currentFrame = session.currentFrame;
                if (currentFrame) {
                    currentFrame.line += 1; // Simulate moving to next line
                    this.debugResources?.updateSession(args.session_id, {
                        currentFrame
                    });
                }
            }, 100);
            // Log the event
            this.logResources?.logDebugSessionEvent(args.session_id, 'Step over executed');
            logger.info("Step over executed", { sessionId: args.session_id });
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            session_id: args.session_id,
                            action: 'step_over',
                            status: 'stepping',
                            message: 'Stepped over function call'
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error stepping over", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error stepping over: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async handleStepOut(args) {
        try {
            // Validate session exists
            const session = this.debugResources?.getSession(args.session_id);
            if (!session) {
                throw new SessionNotFoundError(args.session_id);
            }
            // Check if session is in a paused state
            if (session.status !== 'paused') {
                return {
                    content: [{
                            type: "text",
                            text: `Session ${args.session_id} is not paused (current status: ${session.status}). Can only step from paused state.`
                        }],
                    isError: true
                };
            }
            // Update session status
            this.debugResources?.updateSession(args.session_id, {
                status: 'running'
            });
            // Simulate stepping out (in a real implementation, this would be handled by the debugger)
            setTimeout(() => {
                this.debugResources?.updateSession(args.session_id, {
                    status: 'paused'
                });
                // Simulate returning to caller frame
                // In a real implementation, this would pop the frame stack
                const currentFrame = session.currentFrame;
                if (currentFrame) {
                    // Simulate returning to a previous frame
                    currentFrame.line = Math.max(1, currentFrame.line - 5);
                    this.debugResources?.updateSession(args.session_id, {
                        currentFrame
                    });
                }
            }, 100);
            // Log the event
            this.logResources?.logDebugSessionEvent(args.session_id, 'Step out executed');
            logger.info("Step out executed", { sessionId: args.session_id });
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            session_id: args.session_id,
                            action: 'step_out',
                            status: 'stepping',
                            message: 'Stepped out of function'
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error stepping out", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error stepping out: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async handlePause(args) {
        try {
            // Validate session exists
            const session = this.debugResources?.getSession(args.session_id);
            if (!session) {
                throw new SessionNotFoundError(args.session_id);
            }
            // Check if session is running
            if (session.status !== 'running') {
                return {
                    content: [{
                            type: "text",
                            text: `Session ${args.session_id} is not running (current status: ${session.status}). Can only pause running sessions.`
                        }],
                    isError: true
                };
            }
            // Update session status
            this.debugResources?.updateSession(args.session_id, {
                status: 'paused'
            });
            // In a real implementation, you'd send a pause/interrupt signal to the debugger
            // For now, we'll just update the status
            // Log the event
            this.logResources?.logDebugSessionEvent(args.session_id, 'Execution paused');
            logger.info("Execution paused", { sessionId: args.session_id });
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            session_id: args.session_id,
                            action: 'pause',
                            status: 'paused',
                            message: 'Execution paused successfully'
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error pausing execution", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error pausing execution: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async close() {
        // No cleanup needed for execution tools
        logger.debug("Execution tools closed");
    }
}
//# sourceMappingURL=ExecutionTools.js.map