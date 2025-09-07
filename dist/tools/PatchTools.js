// no-op import removed
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger.js";
export class PatchTools {
    config;
    pendingPatches = new Map();
    constructor(config) {
        this.config = config;
    }
    registerTools(server) {
        if (!this.config.allowFilePatches) {
            logger.warn("File patching is disabled in configuration");
            return;
        }
        // Apply patch tool
        server.registerTool("apply_patch", {
            title: "Apply File Patch",
            description: "Apply a patch to a file with safety confirmations",
            inputSchema: z.object({
                file: z.string().describe("Path to file to patch"),
                start: z.number().int().optional().describe("Starting line number (1-based)"),
                end: z.number().int().optional().describe("Ending line number (1-based)"),
                replacement: z.string().optional().describe("Replacement text for line range patch"),
                unified_diff: z.string().optional().describe("Unified diff format patch"),
                require_confirmation: z.boolean().default(true).describe("Require human confirmation before applying"),
                description: z.string().optional().describe("Description of the patch for confirmation")
            }).refine((data) => {
                // Must provide either line range + replacement OR unified diff
                const hasLineRange = data.start !== undefined && data.end !== undefined && data.replacement !== undefined;
                const hasUnifiedDiff = data.unified_diff !== undefined;
                return hasLineRange || hasUnifiedDiff;
            }, {
                message: "Must provide either (start, end, replacement) for line range patch OR unified_diff for diff patch"
            })
        }, this.handleApplyPatch.bind(this));
        logger.debug("Patch tools registered");
    }
    async handleApplyPatch(args) {
        try {
            if (!this.config.allowFilePatches) {
                return {
                    content: [{
                            type: "text",
                            text: "File patching is disabled in server configuration"
                        }],
                    isError: true
                };
            }
            // Validate file path
            const filePath = path.resolve(this.config.workspaceDir, args.file);
            if (!filePath.startsWith(this.config.workspaceDir)) {
                throw new Error(`File path outside workspace: ${args.file}`);
            }
            // Check if file exists
            try {
                await fs.access(filePath);
            }
            catch {
                throw new Error(`File not found: ${args.file}`);
            }
            const patchId = `patch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            if (args.require_confirmation) {
                // Create pending patch for confirmation
                const pendingPatch = {
                    id: patchId,
                    file: args.file,
                    type: args.unified_diff ? 'diff' : 'range',
                    content: args.unified_diff || args.replacement || '',
                    ...(args.start !== undefined ? { startLine: args.start } : {}),
                    ...(args.end !== undefined ? { endLine: args.end } : {}),
                    applied: false,
                    requiresConfirmation: true,
                    createdAt: new Date()
                };
                this.pendingPatches.set(patchId, pendingPatch);
                logger.info("Patch created pending confirmation", {
                    patchId,
                    file: args.file,
                    type: pendingPatch.type
                });
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                patch_id: patchId,
                                status: 'pending_confirmation',
                                file: args.file,
                                type: pendingPatch.type,
                                description: args.description || 'File patch',
                                message: 'Patch created and requires confirmation before application'
                            }, null, 2)
                        }]
                };
            }
            else {
                // Apply patch directly
                const result = await this.applyPatch({
                    id: patchId,
                    file: args.file,
                    type: args.unified_diff ? 'diff' : 'range',
                    content: args.unified_diff || args.replacement || '',
                    ...(args.start !== undefined ? { startLine: args.start } : {}),
                    ...(args.end !== undefined ? { endLine: args.end } : {}),
                    applied: false,
                    requiresConfirmation: false,
                    createdAt: new Date()
                });
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify(result, null, 2)
                        }]
                };
            }
        }
        catch (error) {
            logger.error("Error applying patch", { error, args });
            return {
                content: [{
                        type: "text",
                        text: `Error applying patch: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    }
    async applyPatch(patch) {
        const filePath = path.resolve(this.config.workspaceDir, patch.file);
        // Read original file content
        const originalContent = await fs.readFile(filePath, 'utf8');
        patch.backup = originalContent;
        let newContent;
        if (patch.type === 'range' && patch.startLine !== undefined && patch.endLine !== undefined) {
            // Apply line range patch
            const lines = originalContent.split(/\r?\n/);
            const startIndex = Math.max(0, patch.startLine - 1); // Convert to 0-based
            const endIndex = Math.min(lines.length, patch.endLine);
            newContent = [
                ...lines.slice(0, startIndex),
                ...patch.content.split(/\r?\n/),
                ...lines.slice(endIndex)
            ].join('\n');
        }
        else if (patch.type === 'diff') {
            // Apply unified diff patch
            // This would require a diff application library in a real implementation
            throw new Error("Unified diff patches not yet implemented");
        }
        else {
            throw new Error("Invalid patch type");
        }
        // Write new content
        await fs.writeFile(filePath, newContent, 'utf8');
        // Update patch status
        patch.applied = true;
        patch.appliedAt = new Date();
        logger.info("Patch applied successfully", {
            patchId: patch.id,
            file: patch.file,
            type: patch.type
        });
        return {
            patch_id: patch.id,
            status: 'applied',
            file: patch.file,
            type: patch.type,
            applied_at: patch.appliedAt?.toISOString(),
            message: 'Patch applied successfully'
        };
    }
    // Method to confirm and apply a pending patch
    async confirmPatch(patchId, confirmedBy) {
        const patch = this.pendingPatches.get(patchId);
        if (!patch) {
            throw new Error(`Pending patch not found: ${patchId}`);
        }
        patch.confirmed = true;
        patch.confirmedBy = confirmedBy;
        patch.confirmedAt = new Date();
        await this.applyPatch(patch);
        this.pendingPatches.delete(patchId);
        return true;
    }
    // Method to reject a pending patch
    rejectPatch(patchId) {
        const deleted = this.pendingPatches.delete(patchId);
        if (deleted) {
            logger.info("Patch rejected", { patchId });
        }
        return deleted;
    }
    async close() {
        this.pendingPatches.clear();
        logger.debug("Patch tools closed");
    }
}
//# sourceMappingURL=PatchTools.js.map