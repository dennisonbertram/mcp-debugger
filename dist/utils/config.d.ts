export declare const config: {
    readonly version: "0.1.0";
    readonly name: "mcp-debugger-server";
    readonly defaultTimeoutMs: 30000;
    readonly maxOutputSizeBytes: 1048576;
    readonly maxFileSizeBytes: 10485760;
    readonly allowedFileExtensions: readonly [".ts", ".js", ".tsx", ".jsx", ".py", ".java", ".cpp", ".c", ".h", ".php", ".rb", ".go", ".rs", ".swift", ".kt", ".scala", ".clj", ".cs", ".fs", ".vb", ".dart", ".lua", ".pl", ".pm", ".tcl", ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".md", ".txt", ".html", ".css", ".scss", ".sass", ".less", ".sql", ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat"];
    readonly allowedCommands: readonly ["npm", "yarn", "pnpm", "bun", "node", "python", "python3", "pip", "pip3", "git", "grep", "find", "ls", "cat", "head", "tail", "jest", "mocha", "vitest", "cypress", "eslint", "prettier", "tsc", "babel", "docker", "docker-compose", "curl", "wget"];
    readonly dangerousCommands: readonly ["rm", "rmdir", "del", "erase", "format", "fdisk", "mkfs", "sudo", "su", "chmod", "chown", "kill", "killall", "pkill", "reboot", "shutdown", "halt", "dd", "mkfs", "mount", "umount"];
    readonly testRunners: {
        readonly javascript: readonly ["npm test", "yarn test", "jest", "mocha", "vitest"];
        readonly typescript: readonly ["npm test", "yarn test", "jest", "mocha", "vitest"];
        readonly python: readonly ["pytest", "python -m unittest", "python -m pytest"];
        readonly java: readonly ["mvn test", "gradle test", "./gradlew test"];
        readonly csharp: readonly ["dotnet test", "xunit", "nunit"];
        readonly go: readonly ["go test", "./test.sh"];
        readonly rust: readonly ["cargo test"];
        readonly php: readonly ["phpunit", "pest", "composer test"];
        readonly ruby: readonly ["rspec", "minitest", "rake test"];
    };
    readonly linters: {
        readonly javascript: readonly ["eslint", "jshint", "jslint"];
        readonly typescript: readonly ["eslint", "tsc --noEmit", "tslint"];
        readonly python: readonly ["pylint", "flake8", "black --check"];
        readonly java: readonly ["checkstyle", "pmd", "spotbugs"];
        readonly csharp: readonly ["stylecop", "resharper"];
        readonly go: readonly ["golint", "golangci-lint"];
        readonly rust: readonly ["clippy", "rustfmt --check"];
        readonly php: readonly ["phpcs", "phpmd", "phan"];
        readonly ruby: readonly ["rubocop", "reek"];
    };
};
//# sourceMappingURL=config.d.ts.map