export const config = {
    version: "0.1.0",
    name: "mcp-debugger-server",
    // Default timeouts and limits
    defaultTimeoutMs: 30000,
    maxOutputSizeBytes: 1048576, // 1MB
    maxFileSizeBytes: 10485760, // 10MB
    // Security settings
    allowedFileExtensions: [
        '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.h',
        '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj',
        '.cs', '.fs', '.vb', '.dart', '.lua', '.pl', '.pm', '.tcl',
        '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
        '.md', '.txt', '.html', '.css', '.scss', '.sass', '.less',
        '.sql', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat'
    ],
    // Command allowlist (basic commands that are generally safe)
    allowedCommands: [
        'npm', 'yarn', 'pnpm', 'bun',
        'node', 'python', 'python3', 'pip', 'pip3',
        'git', 'grep', 'find', 'ls', 'cat', 'head', 'tail',
        'jest', 'mocha', 'vitest', 'cypress',
        'eslint', 'prettier', 'tsc', 'babel',
        'docker', 'docker-compose',
        'curl', 'wget'
    ],
    // Dangerous commands that require explicit approval
    dangerousCommands: [
        'rm', 'rmdir', 'del', 'erase',
        'format', 'fdisk', 'mkfs',
        'sudo', 'su', 'chmod', 'chown',
        'kill', 'killall', 'pkill',
        'reboot', 'shutdown', 'halt',
        'dd', 'mkfs', 'mount', 'umount'
    ],
    // Test runners by language/framework
    testRunners: {
        javascript: ['npm test', 'yarn test', 'jest', 'mocha', 'vitest'],
        typescript: ['npm test', 'yarn test', 'jest', 'mocha', 'vitest'],
        python: ['pytest', 'python -m unittest', 'python -m pytest'],
        java: ['mvn test', 'gradle test', './gradlew test'],
        csharp: ['dotnet test', 'xunit', 'nunit'],
        go: ['go test', './test.sh'],
        rust: ['cargo test'],
        php: ['phpunit', 'pest', 'composer test'],
        ruby: ['rspec', 'minitest', 'rake test']
    },
    // Linters by language
    linters: {
        javascript: ['eslint', 'jshint', 'jslint'],
        typescript: ['eslint', 'tsc --noEmit', 'tslint'],
        python: ['pylint', 'flake8', 'black --check'],
        java: ['checkstyle', 'pmd', 'spotbugs'],
        csharp: ['stylecop', 'resharper'],
        go: ['golint', 'golangci-lint'],
        rust: ['clippy', 'rustfmt --check'],
        php: ['phpcs', 'phpmd', 'phan'],
        ruby: ['rubocop', 'reek']
    }
};
//# sourceMappingURL=config.js.map