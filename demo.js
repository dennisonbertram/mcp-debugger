#!/usr/bin/env node

/**
 * Demo script showing how to interact with the MCP Debugger Server
 * This simulates a client connecting to the server and using various tools
 */

const { spawn } = require('child_process');
const path = require('path');

// Simple MCP client for demo purposes
class MCPClient {
  constructor(serverPath) {
    this.serverPath = serverPath;
    this.server = null;
    this.requestId = 1;
  }

  startServer() {
    console.log('🚀 Starting MCP Debugger Server...');
    this.server = spawn('node', [this.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        WORKSPACE_DIR: process.cwd(),
        ALLOW_FILE_PATCHES: 'true',
        ALLOW_COMMAND_EXECUTION: 'true',
        LOG_LEVEL: 'info'
      }
    });

    this.server.stdout.on('data', (data) => {
      console.log('📥 Server output:', data.toString().trim());
    });

    this.server.stderr.on('data', (data) => {
      console.log('⚠️  Server error:', data.toString().trim());
    });

    return new Promise((resolve) => {
      setTimeout(resolve, 2000); // Wait for server to start
    });
  }

  sendRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    const jsonRequest = JSON.stringify(request) + '\n';
    console.log(`📤 Sending request: ${method}`, params);

    this.server.stdin.write(jsonRequest);
  }

  async runDemo() {
    await this.startServer();

    console.log('\n🎯 Running MCP Debugger Server Demo...\n');

    // Wait a bit for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo sequence
    console.log('1️⃣  Listing available tools...');
    this.sendRequest('tools/list');

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n2️⃣  Listing available resources...');
    this.sendRequest('resources/list');

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n3️⃣  Reading a file (this demo file)...');
    this.sendRequest('resources/read', {
      uri: `workspace://file?path=${path.basename(__filename)}&start=1&end=20`
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n4️⃣  Running a simple test (if available)...');
    this.sendRequest('tools/call', {
      name: 'run_command',
      arguments: {
        command: 'echo',
        args: ['Hello from MCP Debugger!']
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n5️⃣  Checking git status...');
    this.sendRequest('tools/call', {
      name: 'git_status',
      arguments: {}
    });

    // Keep running for a bit to see responses
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n✨ Demo completed! The server is still running.');
    console.log('You can now interact with it using any MCP client.');
    console.log('To stop the server, press Ctrl+C.');
  }

  stop() {
    if (this.server) {
      console.log('\n🛑 Stopping server...');
      this.server.kill('SIGTERM');
    }
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  const client = new MCPClient('./dist/index.js');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    client.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    client.stop();
    process.exit(0);
  });

  client.runDemo().catch((error) => {
    console.error('Demo failed:', error);
    client.stop();
    process.exit(1);
  });
}

module.exports = MCPClient;
