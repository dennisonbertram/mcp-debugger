import { z } from "zod";

// Debug Session Types
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

// Test Report Types
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

// Lint Report Types
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

// Command Execution Types
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

// File Patch Types
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

// Log Entry Types
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  data?: Record<string, any>;
}

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
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MCPDebuggerError';
  }
}

export class SessionNotFoundError extends MCPDebuggerError {
  constructor(sessionId: string) {
    super(`Debug session not found: ${sessionId}`, 'SESSION_NOT_FOUND', { sessionId });
  }
}

export class SessionAlreadyExistsError extends MCPDebuggerError {
  constructor(sessionId: string) {
    super(`Debug session already exists: ${sessionId}`, 'SESSION_EXISTS', { sessionId });
  }
}

export class BreakpointNotFoundError extends MCPDebuggerError {
  constructor(breakpointId: string) {
    super(`Breakpoint not found: ${breakpointId}`, 'BREAKPOINT_NOT_FOUND', { breakpointId });
  }
}

export class FileAccessDeniedError extends MCPDebuggerError {
  constructor(file: string) {
    super(`File access denied: ${file}`, 'FILE_ACCESS_DENIED', { file });
  }
}

export class CommandNotAllowedError extends MCPDebuggerError {
  constructor(command: string) {
    super(`Command not allowed: ${command}`, 'COMMAND_NOT_ALLOWED', { command });
  }
}

export class TimeoutError extends MCPDebuggerError {
  constructor(operation: string, timeout: number) {
    super(`Operation timed out: ${operation}`, 'TIMEOUT', { operation, timeout });
  }
}

// Configuration Types
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

// Result Types for MCP Tools
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
