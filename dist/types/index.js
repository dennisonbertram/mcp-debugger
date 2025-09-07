import { z } from "zod";
// Zod Schemas for API Validation
export const DebugSessionSchema = z.object({
    id: z.string(),
    kind: z.enum(['node', 'python', 'go', 'java', 'csharp', 'cpp', 'php', 'ruby', 'rust']),
    cwd: z.string(),
    entryPoint: z.string().optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    status: z.enum(['starting', 'running', 'paused', 'stopped', 'error']),
    createdAt: z.date(),
    lastActivity: z.date(),
});
export const BreakpointSchema = z.object({
    id: z.string(),
    file: z.string(),
    line: z.number().int().positive(),
    condition: z.string().optional(),
    enabled: z.boolean(),
});
export const VariableSchema = z.object({
    name: z.string(),
    value: z.any(),
    type: z.string(),
    reference: z.number().optional(),
});
// Error Types
export class MCPDebuggerError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'MCPDebuggerError';
    }
}
export class SessionNotFoundError extends MCPDebuggerError {
    constructor(sessionId) {
        super(`Debug session not found: ${sessionId}`, 'SESSION_NOT_FOUND', { sessionId });
    }
}
export class SessionAlreadyExistsError extends MCPDebuggerError {
    constructor(sessionId) {
        super(`Debug session already exists: ${sessionId}`, 'SESSION_EXISTS', { sessionId });
    }
}
export class BreakpointNotFoundError extends MCPDebuggerError {
    constructor(breakpointId) {
        super(`Breakpoint not found: ${breakpointId}`, 'BREAKPOINT_NOT_FOUND', { breakpointId });
    }
}
export class FileAccessDeniedError extends MCPDebuggerError {
    constructor(file) {
        super(`File access denied: ${file}`, 'FILE_ACCESS_DENIED', { file });
    }
}
export class CommandNotAllowedError extends MCPDebuggerError {
    constructor(command) {
        super(`Command not allowed: ${command}`, 'COMMAND_NOT_ALLOWED', { command });
    }
}
export class TimeoutError extends MCPDebuggerError {
    constructor(operation, timeout) {
        super(`Operation timed out: ${operation}`, 'TIMEOUT', { operation, timeout });
    }
}
//# sourceMappingURL=index.js.map