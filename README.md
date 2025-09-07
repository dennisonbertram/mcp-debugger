# MCP Debugger Server

A comprehensive Model Context Protocol (MCP) server that provides debugging, testing, linting, and code analysis capabilities to LLM applications. This server enables AI assistants to interact with codebases through a standardized protocol, supporting multiple programming languages and runtimes.

## Features

### Resources
- **Workspace Files**: Read files and file slices from the workspace
- **Git Integration**: Access to git status, diff, and repository information
- **Debug Sessions**: Real-time debug session state and thread information
- **Stack Traces**: Current call stack frames and local variables
- **Test Reports**: Test execution results and failure analysis
- **Lint Reports**: Code quality and style analysis results
- **Logs**: Structured logging with filtering and search capabilities

### Tools
- **Debug Session Management**: Open/close debug sessions for multiple runtimes
- **Breakpoint Control**: Set, clear, enable/disable breakpoints
- **Execution Control**: Step into/over/out, continue, pause execution
- **Expression Evaluation**: Evaluate expressions in debug contexts
- **Watch Expressions**: Monitor variable values during execution
- **File Patching**: Apply patches with safety confirmations
- **Testing**: Run test suites and analyze results
- **Linting**: Execute code quality checks
- **Command Execution**: Run whitelisted system commands
- **Git Operations**: Commit changes with human confirmation

## Supported Runtimes

- **Node.js**: Full Chrome DevTools Protocol (CDP) support
- **Python**: Debug adapter protocol via debugpy
- **Go**: Delve debugger integration
- **Java**: JDWP (Java Debug Wire Protocol)
- **C#**: .NET debugging via Visual Studio protocol
- **C/C++**: GDB/LLDB integration
- **PHP**: Xdebug support
- **Ruby**: Ruby debugger integration
- **Rust**: Native debugging support

## Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Or run directly with ts-node
npm run dev
```

## Configuration

### Environment Variables

```bash
# Workspace directory (defaults to current directory)
WORKSPACE_DIR=/path/to/your/project

# Enable/disable dangerous features
ALLOW_FILE_PATCHES=true
ALLOW_COMMAND_EXECUTION=false

# Limits and timeouts
MAX_EXECUTION_TIME_MS=30000
MAX_OUTPUT_BYTES=1048576

# Logging
LOG_LEVEL=info
```

### Security Features

- **Path Traversal Protection**: All file operations are sandboxed to the workspace
- **Command Whitelisting**: Only approved commands can be executed
- **Patch Confirmation**: File patches require explicit confirmation
- **Output Limiting**: Prevents excessive memory usage from large outputs
- **Timeout Protection**: All operations have configurable timeouts

## Usage

### Starting the Server

```bash
# Production build
npm start

# Development with auto-reload
npm run dev

# With custom workspace
WORKSPACE_DIR=/my/project npm start
```

### MCP Client Integration

The server communicates via stdio using the MCP protocol. Connect it to any MCP-compatible client:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Create MCP client
const client = new Client({
  name: "my-debug-client",
  version: "1.0.0"
});

// Connect to the debugger server
const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"]
});

await client.connect(transport);
await client.initialize();
```

### Example Workflow

1. **Open Debug Session**
```typescript
const result = await client.callTool({
  name: "open_debug_session",
  arguments: {
    kind: "node",
    entry: "src/index.js",
    args: ["--port", "3000"]
  }
});
const sessionId = result.content[0].text.session_id;
```

2. **Set Breakpoints**
```typescript
await client.callTool({
  name: "set_breakpoint",
  arguments: {
    session_id: sessionId,
    file: "src/server.js",
    line: 42,
    condition: "user.id > 0"
  }
});
```

3. **Inspect State**
```typescript
// Get stack trace
const stack = await client.callTool({
  name: "stack_trace",
  arguments: { session_id: sessionId }
});

// Evaluate expressions
const result = await client.callTool({
  name: "evaluate_expression",
  arguments: {
    session_id: sessionId,
    expression: "user.profile",
    frame_id: "frame_0"
  }
});
```

4. **Apply Fixes**
```typescript
// Apply a patch (will require confirmation)
await client.callTool({
  name: "apply_patch",
  arguments: {
    file: "src/buggy.js",
    start: 41,
    end: 43,
    replacement: "if (user && user.id > 0) {",
    require_confirmation: true
  }
});
```

5. **Run Tests**
```typescript
const testResult = await client.callTool({
  name: "run_tests",
  arguments: {
    runner: "npm",
    args: ["test", "--", "--grep", "user"]
  }
});
```

## API Reference

### Resources

#### `workspace://file`
Read files and file slices from the workspace.

**Parameters:**
- `path`: Relative path to file
- `start`: Starting line number (optional)
- `end`: Ending line number (optional)

**Example:**
```
workspace://file?path=src/index.js&start=1&end=50
```

#### `debug://session/{sessionId}/state`
Get debug session state information.

#### `debug://session/{sessionId}/locals`
Get local variables for the current frame.

#### `logs://app`
Access application logs with filtering.

**Parameters:**
- `level`: Log level filter (debug, info, warn, error)
- `since`: ISO date string for start time
- `contains`: Text search in log messages
- `limit`: Maximum number of entries to return

### Tools

#### Debug Session Management
- `open_debug_session`: Start a new debug session
- `close_debug_session`: Terminate a debug session
- `list_debug_sessions`: List all active sessions

#### Breakpoint Control
- `set_breakpoint`: Set a breakpoint at a file location
- `clear_breakpoint`: Remove a breakpoint
- `list_breakpoints`: List all breakpoints in a session
- `toggle_breakpoint`: Enable/disable a breakpoint

#### Execution Control
- `continue_execution`: Continue from current breakpoint
- `step_into`: Step into function calls
- `step_over`: Step over function calls
- `step_out`: Step out of current function
- `pause_execution`: Pause running execution

#### Expression Evaluation
- `evaluate_expression`: Evaluate JavaScript/Python/etc. expressions
- `watch_expression`: Set up watch expressions
- `list_watch_expressions`: List active watch expressions
- `clear_watch_expression`: Remove watch expressions

#### Testing and Linting
- `run_tests`: Execute test suites
- `run_lint`: Execute code quality checks

#### File Operations
- `apply_patch`: Apply patches to files (with confirmation)
- `run_command`: Execute whitelisted system commands
- `git_commit`: Commit changes (with confirmation)

## Architecture

The server is built with a modular architecture:

```
MCPDebuggerServer
├── Resources/
│   ├── WorkspaceResources    # File/Git operations
│   ├── DebugResources        # Debug session state
│   ├── TestResources         # Test/lint reports
│   └── LogResources          # Logging infrastructure
├── Tools/
│   ├── DebugSessionTools     # Session management
│   ├── BreakpointTools       # Breakpoint operations
│   ├── ExecutionTools        # Step/continue operations
│   ├── EvaluationTool        # Expression evaluation
│   ├── TestTools            # Testing operations
│   ├── LintTools            # Linting operations
│   ├── PatchTools           # File patching
│   ├── CommandTools         # Command execution
│   └── GitTools             # Git operations
└── Utils/
    ├── Logger               # Structured logging
    └── Config               # Configuration management
```

Each component is designed to be extensible and can be easily enhanced to support additional runtimes, tools, and resources.

## Extending the Server

### Adding New Runtimes

1. Implement the `DebuggerAdapter` interface:
```typescript
class MyRuntimeAdapter implements DebuggerAdapter {
  // Implement required methods
  async launch(entry: string, args?: string[], env?: Record<string, string>): Promise<void> {
    // Start your runtime's debugger
  }

  async setBreakpoint(bp: Breakpoint): Promise<Breakpoint> {
    // Set breakpoint in your runtime
  }

  // ... other required methods
}
```

2. Register the adapter in `DebugSessionTools`:
```typescript
if (args.kind === 'myruntime') {
  adapter = new MyRuntimeAdapter(cwd);
}
```

### Adding New Tools

1. Create a new tool class extending the base pattern:
```typescript
export class MyCustomTool {
  registerTools(server: McpServer): void {
    server.registerTool("my_custom_tool", {
      // Tool definition
    }, this.handleMyCustomTool.bind(this));
  }

  private async handleMyCustomTool(args: any): Promise<MCPToolResult> {
    // Tool implementation
  }
}
```

2. Register the tool in `MCPDebuggerServer`:
```typescript
this.myCustomTool = new MyCustomTool(config);
this.myCustomTool.registerTools(this.server);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [Report bugs and request features](https://github.com/your-org/mcp-debugger-server/issues)
- Documentation: [Full API reference](https://github.com/your-org/mcp-debugger-server/docs)

## Changelog

### v0.1.0
- Initial release with Node.js debugging support
- Basic workspace file operations
- Git integration
- Test and lint execution
- File patching with safety confirmations
- Command execution with whitelisting
- Comprehensive logging and error handling
