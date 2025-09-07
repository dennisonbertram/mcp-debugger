// no-op import removed
import { z } from "zod";
import simpleGit from "simple-git";
import { logger } from "../utils/logger.js";
export class GitTools {
    _config;
    git;
    constructor(config) {
        this._config = config;
        this.git = simpleGit(config.workspaceDir);
    }
    registerTools(server) {
        // Git status tool
        server.registerTool("git_status", {
            title: "Git Status",
            description: "Get the current git repository status",
            inputSchema: z.object({})
        }, this.handleGitStatus.bind(this));
        // Git diff tool
        server.registerTool("git_diff", {
            title: "Git Diff",
            description: "Show git diff for files",
            inputSchema: z.object({
                staged: z.boolean().optional().default(false).describe("Show staged changes"),
                paths: z.array(z.string()).optional().describe("Specific file paths")
            })
        }, this.handleGitDiff.bind(this));
        // Git commit tool
        server.registerTool("git_commit", {
            title: "Git Commit",
            description: "Commit changes to git repository",
            inputSchema: z.object({
                message: z.string().describe("Commit message"),
                files: z.array(z.string()).optional().describe("Specific files to commit"),
                require_confirmation: z.boolean().default(true).describe("Require confirmation before committing")
            })
        }, this.handleGitCommit.bind(this));
        logger.debug("Git tools registered");
    }
    async handleGitStatus(_args) {
        try {
            const status = await this.git.status();
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: 'success',
                            branch: status.current,
                            ahead: status.ahead,
                            behind: status.behind,
                            isClean: status.isClean(),
                            files: {
                                staged: status.staged,
                                modified: status.modified,
                                created: status.created,
                                deleted: status.deleted,
                                renamed: status.renamed,
                                conflicted: status.conflicted
                            }
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error getting git status", { error });
            return {
                content: [{
                        type: "text",
                        text: `Error getting git status: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async handleGitDiff(args) {
        try {
            const options = args.staged ? ['--staged'] : [];
            if (args.paths && args.paths.length > 0) {
                options.push('--', ...args.paths);
            }
            const diff = await this.git.diff(options);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: 'success',
                            staged: args.staged,
                            paths: args.paths,
                            diff: diff
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error getting git diff", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error getting git diff: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async handleGitCommit(args) {
        try {
            if (args.require_confirmation) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                status: 'pending_confirmation',
                                message: args.message,
                                files: args.files,
                                requires_confirmation: true
                            }, null, 2)
                        }]
                };
            }
            // Add files if specified
            if (args.files && args.files.length > 0) {
                await this.git.add(args.files);
            }
            else {
                await this.git.add('.');
            }
            // Commit
            const result = await this.git.commit(args.message);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: 'success',
                            message: args.message,
                            files: args.files,
                            commit: result.commit,
                            summary: result.summary
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            logger.error("Error committing to git", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error committing to git: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async close() {
        logger.debug("Git tools closed");
    }
}
//# sourceMappingURL=GitTools.js.map