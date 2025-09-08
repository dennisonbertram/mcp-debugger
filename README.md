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

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/dennisonbertram/mcp-debugger.git
cd mcp-debugger

# Install dependencies
npm install

# Build the server
npm run build

# Or run directly with ts-node (development)
npm run dev
```

### Cloud Code IDE Integration

#### Prerequisites
- [Google Cloud Code](https://cloud.google.com/code) extension installed in VS Code/IntelliJ
- Node.js 18+ installed
- Git repository initialized in your project

#### Quick Start with Cloud Code

1. **Install the MCP Debugger Server globally:**
```bash
npm install -g https://github.com/dennisonbertram/mcp-debugger.git
```

2. **Add to your Cloud Code MCP configuration:**
```json
{
  "mcp": {
    "servers": {
      "debugger": {
        "command": "mcp-debugger-server",
        "args": [],
        "env": {
          "WORKSPACE_DIR": "${workspaceFolder}"
        }
      }
    }
  }
}
```

3. **Alternative: Run locally in your project:**
```bash
# Add to package.json scripts
{
  "scripts": {
    "mcp-debugger": "node dist/index.js"
  }
}
```

#### Cloud Code Configuration File

Create or update your `.vscode/settings.json`:

```json
{
  "cloudcode.mcp.enabled": true,
  "cloudcode.mcp.servers": {
    "debugger": {
      "command": "node",
      "args": ["${workspaceFolder}/node_modules/@dennisonbertram/mcp-debugger/dist/index.js"],
      "env": {
        "WORKSPACE_DIR": "${workspaceFolder}",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### IntelliJ Cloud Code Configuration

For IntelliJ IDEA with Cloud Code:

1. Go to **Settings** → **Tools** → **Cloud Code** → **MCP**
2. Add new MCP server:
   - **Name**: MCP Debugger
   - **Command**: `node`
   - **Arguments**: `${project.dir}/node_modules/@dennisonbertram/mcp-debugger/dist/index.js`
   - **Environment Variables**:
     - `WORKSPACE_DIR=${project.dir}`
     - `LOG_LEVEL=info`

### MCP-Cloud Platform Deployment

For cloud-hosted deployment using MCP-Cloud platform:

```bash
# Deploy to MCP-Cloud (requires API key)
curl -X POST https://api.mcp-cloud.ai/v1/servers \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-debugger-server",
    "template": "custom",
    "env": {
      "WORKSPACE_DIR": "/app",
      "LOG_LEVEL": "info"
    }
  }'
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t mcp-debugger .
docker run -p 3000:3000 -e WORKSPACE_DIR=/app mcp-debugger
```

### MCP-Cloud Integration

The MCP Debugger Server can be deployed and managed through the MCP-Cloud platform for enterprise-scale usage:

#### Authentication Setup
```bash
# Set API key for MCP-Cloud
export MCP_API_KEY="mcp_sk_your_api_key_here"
```

#### Python Client Integration
```python
import requests

def debug_with_mcp(prompt, session_id=None):
    url = "https://your-server.mcp-cloud.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.environ['MCP_API_KEY']}"
    }

    data = {
        "model": "claude-3-5-sonnet",
        "messages": [{"role": "user", "content": prompt}],
        "context_id": session_id  # For maintaining debug context
    }

    response = requests.post(url, headers=headers, json=data)
    return response.json()
```

#### JavaScript/Node.js Client
```javascript
async function debugWithMCP(prompt, sessionId = null) {
  const response = await fetch('https://your-server.mcp-cloud.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MCP_API_KEY}`
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: prompt }],
      context_id: sessionId
    })
  });

  return response.json();
}
```

#### Real-time Streaming with SSE
```javascript
// Enable streaming for real-time debug output
const eventSource = new EventSource(
  'https://your-server.mcp-cloud.ai/api/servers/debug-session/events',
  {
    headers: {
      'Authorization': `Bearer ${process.env.MCP_API_KEY}`
    }
  }
);

eventSource.addEventListener('debug:output', (event) => {
  const data = JSON.parse(event.data);
  console.log('Debug output:', data.message);
});

eventSource.addEventListener('breakpoint:hit', (event) => {
  const data = JSON.parse(event.data);
  console.log('Breakpoint hit at line:', data.line);
});
```

### Workflow Integration (n8n, Zapier, etc.)

#### n8n Integration Example
```javascript
// In an n8n Function node
const axios = require('axios');

async function debugCode(codeSnippet) {
  const response = await axios.post(
    'https://your-server.mcp-cloud.ai/v1/chat/completions',
    {
      model: "claude-3-5-sonnet",
      messages: [
        {
          role: "system",
          content: "You are a debugging assistant. Analyze the following code for issues."
        },
        {
          role: "user",
          content: codeSnippet
        }
      ],
      stream: true  // Enable streaming for real-time responses
    },
    {
      headers: {
        'Authorization': `Bearer ${$credentials.mcpApi.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}
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

## MCP Client Integration

### Claude Desktop (One-Line Setup)

**Quick setup command:**
```bash
# Add to Claude Desktop config (one line)
echo '{"mcpServers":{"debugger":{"command":"node","args":["/path/to/mcp-debugger/dist/index.js"],"env":{"WORKSPACE_DIR":"'"$PWD"'"}}}}' >> ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Or manually edit the config file:**
```bash
# macOS/Linux
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows
code %APPDATA%\Claude\claude_desktop_config.json
```

**Add this configuration:**
```json
{
  "mcpServers": {
    "debugger": {
      "command": "node",
      "args": ["/path/to/mcp-debugger/dist/index.js"],
      "env": {
        "WORKSPACE_DIR": "/path/to/your/project"
      }
    }
  }
}
```

### Programmatic Client Integration

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

### Available Client Libraries

#### Python MCP Client
```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    # Connect to MCP Debugger Server
    server_params = StdioServerParameters(
        command="node",
        args=["/path/to/mcp-debugger/dist/index.js"],
        env={"WORKSPACE_DIR": "/your/project"}
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Use debugging tools
            result = await session.call_tool("open_debug_session", {
                "kind": "node",
                "entry": "app.js"
            })

            print("Debug session opened:", result)

asyncio.run(main())
```

#### Java MCP Client
```java
import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.transport.StdioClientTransport;

public class DebugClient {
    public static void main(String[] args) {
        // Create MCP client
        McpClient client = McpClient.builder()
            .name("Debug Client")
            .version("1.0.0")
            .build();

        // Connect via stdio
        StdioClientTransport transport = new StdioClientTransport(
            "node",
            List.of("/path/to/mcp-debugger/dist/index.js")
        );

        client.connect(transport);

        // Use debugging capabilities
        ToolResult result = client.callTool("open_debug_session",
            Map.of("kind", "node", "entry", "app.js"));

        System.out.println("Debug session: " + result);
    }
}
```

#### cURL for Testing
```bash
# Test server health
curl -X POST http://localhost:3000/health

# Test MCP protocol (if using HTTP transport)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-06-18"},"id":1}'
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

## Supported Integrations

### IDEs and Editors
- **VS Code**: Full Cloud Code integration
- **IntelliJ IDEA**: Cloud Code plugin support
- **Claude Desktop**: Native MCP support
- **Cursor**: MCP protocol support
- **Windsurf**: MCP integration
- **Zed**: MCP support

### Cloud Platforms
- **MCP-Cloud**: Enterprise deployment platform
- **Google Cloud Code**: Direct IDE integration
- **Docker**: Containerized deployment
- **Kubernetes**: Orchestrated deployments

### Workflow Automation
- **n8n**: Visual workflow integration
- **Zapier**: API-based integration
- **Make.com**: Workflow automation
- **GitHub Actions**: CI/CD integration

### Programming Languages
- **TypeScript/JavaScript**: Native support
- **Python**: Debug adapter protocol
- **Go**: Delve integration
- **Java**: JDWP support
- **C#**: .NET debugging
- **C/C++**: GDB/LLDB support
- **PHP**: Xdebug integration
- **Ruby**: Ruby debugger
- **Rust**: Native debugging

## Support

For issues and questions:
- GitHub Issues: [Report bugs and request features](https://github.com/dennisonbertram/mcp-debugger/issues)
- Documentation: [Full API reference](https://github.com/dennisonbertram/mcp-debugger#readme)
- Discussions: [Community support](https://github.com/dennisonbertram/mcp-debugger/discussions)

## Changelog

### v0.1.0
- Initial release with Node.js debugging support
- Basic workspace file operations
- Git integration
- Test and lint execution
- File patching with safety confirmations
- Command execution with whitelisting
- Comprehensive logging and error handling
