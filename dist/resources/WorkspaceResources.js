import fs from "fs/promises";
import path from "path";
import simpleGit from "simple-git";
import { logger } from "../utils/logger.js";
import { FileAccessDeniedError } from "../types/index.js";
export class WorkspaceResources {
    config;
    git;
    constructor(config) {
        this.config = config;
        this.git = simpleGit(config.workspaceDir);
    }
    registerResources(_server) {
        logger.debug("Workspace resources registered (simplified for now)");
    }
    async handleFileResource(uri, params) {
        try {
            const filePath = params.path;
            if (!filePath) {
                throw new Error("Missing required parameter: path");
            }
            // Security: Validate and resolve the file path
            const resolvedPath = await this.validateAndResolvePath(filePath);
            // Check file size
            const stats = await fs.stat(resolvedPath);
            if (stats.size > this.config.maxFileSizeBytes) {
                throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSizeBytes})`);
            }
            // Read the file
            let content = await fs.readFile(resolvedPath, 'utf8');
            const lines = content.split(/\r?\n/);
            // Apply line range slicing if requested
            const start = params.start ? parseInt(params.start, 10) : undefined;
            const end = params.end ? parseInt(params.end, 10) : undefined;
            if (start !== undefined || end !== undefined) {
                const startLine = Math.max(1, start || 1) - 1; // Convert to 0-based
                const endLine = Math.min(lines.length, end || lines.length);
                content = lines.slice(startLine, endLine).join('\n');
            }
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: this.getMimeType(resolvedPath),
                        text: content
                    }]
            };
        }
        catch (error) {
            logger.error("Error handling file resource", { error, uri: uri.href, params });
            throw error;
        }
    }
    async handleDiagnosticsResource(uri, params) {
        try {
            const filePath = params.path;
            const type = params.type || 'all';
            if (!filePath) {
                throw new Error("Missing required parameter: path");
            }
            const resolvedPath = await this.validateAndResolvePath(filePath);
            // For now, return basic file information
            // In a real implementation, you'd integrate with linters, type checkers, etc.
            const diagnostics = await this.generateDiagnostics(resolvedPath, type);
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify(diagnostics, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error handling diagnostics resource", { error, uri: uri.href, params });
            throw error;
        }
    }
    async handleGitStatusResource(uri) {
        try {
            const status = await this.git.status();
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify(status, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error handling git status resource", { error, uri: uri.href });
            // Return empty status if git repo doesn't exist
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify({ notGitRepo: true }, null, 2)
                    }]
            };
        }
    }
    async handleGitDiffResource(uri, params) {
        try {
            const options = [];
            if (params.staged === 'true') {
                options.push('--staged');
            }
            if (params.commit) {
                options.push(params.commit);
            }
            if (params.path) {
                options.push('--', params.path);
            }
            const diff = await this.git.diff(options);
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: "text/plain",
                        text: diff
                    }]
            };
        }
        catch (error) {
            logger.error("Error handling git diff resource", { error, uri: uri.href, params });
            throw error;
        }
    }
    async handleFileListingResource(uri, params) {
        try {
            const pattern = params.pattern || '**/*';
            const recursive = params.recursive !== 'false';
            // For now, return a simple directory listing
            // In a real implementation, you'd use glob patterns
            const files = await this.listFiles(this.config.workspaceDir, pattern, recursive);
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify({ files }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error handling file listing resource", { error, uri: uri.href, params });
            throw error;
        }
    }
    async validateAndResolvePath(filePath) {
        // Resolve the path relative to workspace
        const resolvedPath = path.resolve(this.config.workspaceDir, filePath);
        // Ensure the resolved path is within the workspace
        if (!resolvedPath.startsWith(this.config.workspaceDir)) {
            throw new FileAccessDeniedError(filePath);
        }
        // Check if file exists
        try {
            await fs.access(resolvedPath);
        }
        catch {
            throw new Error(`File not found: ${filePath}`);
        }
        // Check file extension is allowed
        const ext = path.extname(resolvedPath).toLowerCase();
        if (this.config.allowedFileExtensions && !this.config.allowedFileExtensions.includes(ext)) {
            throw new FileAccessDeniedError(filePath);
        }
        return resolvedPath;
    }
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.js': 'application/javascript',
            '.ts': 'application/typescript',
            '.json': 'application/json',
            '.html': 'text/html',
            '.css': 'text/css',
            '.md': 'text/markdown',
            '.txt': 'text/plain',
            '.py': 'text/x-python',
            '.java': 'text/x-java-source',
            '.cpp': 'text/x-c++src',
            '.c': 'text/x-csrc',
            '.php': 'application/x-php',
            '.rb': 'text/x-ruby',
            '.go': 'text/x-go',
            '.rs': 'text/x-rust',
            '.swift': 'text/x-swift',
            '.kt': 'text/x-kotlin',
            '.scala': 'text/x-scala',
            '.cs': 'text/x-csharp',
            '.fs': 'text/x-fsharp',
            '.xml': 'application/xml',
            '.yaml': 'application/x-yaml',
            '.yml': 'application/x-yaml',
            '.toml': 'application/toml',
            '.ini': 'text/plain',
            '.cfg': 'text/plain',
            '.sh': 'application/x-shellscript',
            '.bash': 'application/x-shellscript',
            '.zsh': 'application/x-shellscript',
            '.ps1': 'application/x-powershell',
            '.sql': 'application/sql'
        };
        return mimeTypes[ext] || 'text/plain';
    }
    async generateDiagnostics(filePath, type) {
        // Basic file diagnostics - in a real implementation, you'd integrate
        // with actual linters, type checkers, etc.
        const stats = await fs.stat(filePath);
        return {
            file: path.relative(this.config.workspaceDir, filePath),
            size: stats.size,
            modified: stats.mtime.toISOString(),
            diagnostics: [], // Empty for now - would be populated by actual tools
            type: type
        };
    }
    async listFiles(dir, pattern, recursive) {
        // Simple implementation - in a real implementation, you'd use glob
        const files = [];
        async function scan(currentDir, relativePath = '') {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                const relPath = path.join(relativePath, entry.name);
                if (entry.isDirectory() && recursive && !entry.name.startsWith('.')) {
                    await scan(fullPath, relPath);
                }
                else if (entry.isFile()) {
                    if (pattern === '**/*' || relPath.includes(pattern)) {
                        files.push(relPath);
                    }
                }
            }
        }
        await scan(dir);
        return files;
    }
    async close() {
        // Cleanup if needed
        logger.debug("Workspace resources closed");
    }
}
//# sourceMappingURL=WorkspaceResources.js.map