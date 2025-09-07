import { z } from "zod";
export interface DebugSession {
    id: string;
    kind: 'node' | 'python' | 'go' | 'java' | 'csharp' | 'cpp' | 'php' | 'ruby' | 'rust';
    cwd: string;
    entryPoint: string;
    args?: string[];
    env?: Record<string, string>;
    status: 'starting' | 'running' | 'paused' | 'stopped' | 'error';
    createdAt: Date;
    lastActivity: Date;
    breakpoints: Breakpoint[];
    currentFrame?: StackFrame;
    threads: Thread[];
    output: string[];
    errorOutput: string[];
    exitCode?: number;
}
export interface Breakpoint {
    id: string;
    file: string;
    line: number;
    condition?: string;
    enabled: boolean;
    hitCount: number;
    createdAt: Date;
}
export interface Thread {
    id: number;
    name: string;
    status: 'running' | 'paused' | 'stopped';
}
export interface StackFrame {
    id: number;
    name: string;
    file: string;
    line: number;
    column?: number;
    source?: string;
}
export interface Variable {
    name: string;
    value: any;
    type: string;
    reference?: number;
}
export interface TestReport {
    id: string;
    sessionId?: string;
    runner: string;
    target?: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    startTime: Date;
    endTime?: Date;
    summary: TestSummary;
    failures: TestFailure[];
    output: string;
    errorOutput: string;
}
export interface TestSummary {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
}
export interface TestFailure {
    test: string;
    file?: string;
    line?: number;
    message: string;
    stackTrace?: string;
}
export interface LintReport {
    id: string;
    sessionId?: string;
    tool: string;
    paths: string[];
    status: 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    issues: LintIssue[];
    output: string;
    errorOutput: string;
}
export interface LintIssue {
    file: string;
    line: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule?: string;
    code?: string;
}
export interface CommandExecution {
    id: string;
    command: string;
    args: string[];
    cwd: string;
    env?: Record<string, string>;
    status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
    startTime: Date;
    endTime?: Date;
    exitCode?: number;
    output: string;
    errorOutput: string;
    timeout?: number;
}
export interface FilePatch {
    id: string;
    file: string;
    type: 'range' | 'diff';
    content: string;
    startLine?: number;
    endLine?: number;
    applied: boolean;
    appliedAt?: Date;
    backup?: string;
    requiresConfirmation: boolean;
    confirmed?: boolean;
    confirmedBy?: string;
    confirmedAt?: Date;
    createdAt?: Date;
}
export interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    source: string;
    message: string;
    data?: Record<string, any>;
}
export declare const DebugSessionSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<["node", "python", "go", "java", "csharp", "cpp", "php", "ruby", "rust"]>;
    cwd: z.ZodString;
    entryPoint: z.ZodOptional<z.ZodString>;
    args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    status: z.ZodEnum<["starting", "running", "paused", "stopped", "error"]>;
    createdAt: z.ZodDate;
    lastActivity: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    kind: "node" | "python" | "go" | "java" | "csharp" | "cpp" | "php" | "ruby" | "rust";
    status: "error" | "starting" | "running" | "paused" | "stopped";
    cwd: string;
    createdAt: Date;
    lastActivity: Date;
    entryPoint?: string | undefined;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
}, {
    id: string;
    kind: "node" | "python" | "go" | "java" | "csharp" | "cpp" | "php" | "ruby" | "rust";
    status: "error" | "starting" | "running" | "paused" | "stopped";
    cwd: string;
    createdAt: Date;
    lastActivity: Date;
    entryPoint?: string | undefined;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
}>;
export declare const BreakpointSchema: z.ZodObject<{
    id: z.ZodString;
    file: z.ZodString;
    line: z.ZodNumber;
    condition: z.ZodOptional<z.ZodString>;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    file: string;
    line: number;
    enabled: boolean;
    condition?: string | undefined;
}, {
    id: string;
    file: string;
    line: number;
    enabled: boolean;
    condition?: string | undefined;
}>;
export declare const VariableSchema: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodAny;
    type: z.ZodString;
    reference: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: string;
    name: string;
    value?: any;
    reference?: number | undefined;
}, {
    type: string;
    name: string;
    value?: any;
    reference?: number | undefined;
}>;
export declare class MCPDebuggerError extends Error {
    code: string;
    details?: Record<string, any> | undefined;
    constructor(message: string, code: string, details?: Record<string, any> | undefined);
}
export declare class SessionNotFoundError extends MCPDebuggerError {
    constructor(sessionId: string);
}
export declare class SessionAlreadyExistsError extends MCPDebuggerError {
    constructor(sessionId: string);
}
export declare class BreakpointNotFoundError extends MCPDebuggerError {
    constructor(breakpointId: string);
}
export declare class FileAccessDeniedError extends MCPDebuggerError {
    constructor(file: string);
}
export declare class CommandNotAllowedError extends MCPDebuggerError {
    constructor(command: string);
}
export declare class TimeoutError extends MCPDebuggerError {
    constructor(operation: string, timeout: number);
}
export interface MCPDebuggerConfig {
    workspaceDir: string;
    allowFilePatches: boolean;
    allowCommandExecution: boolean;
    maxExecutionTimeMs: number;
    maxOutputBytes: number;
    maxFileSizeBytes: number;
    allowedCommands?: string[];
    allowedFileExtensions?: string[];
    maxConcurrentSessions?: number;
    sessionTimeoutMs?: number;
}
export interface MCPToolResult {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}
export interface MCPResourceResult {
    contents: Array<{
        uri: string;
        mimeType: string;
        text?: string;
        blob?: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map