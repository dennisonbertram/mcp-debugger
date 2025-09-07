import type { MCPDebuggerConfig, TestReport, LintReport } from "../types/index.js";
export declare class TestResources {
    private config;
    private testReports;
    private lintReports;
    constructor(config: MCPDebuggerConfig);
    registerResources(_server: any): void;
    addTestReport(report: TestReport): void;
    addLintReport(report: LintReport): void;
    getTestReport(reportId: string): TestReport | undefined;
    getLintReport(reportId: string): LintReport | undefined;
    getLatestTestReport(): TestReport | undefined;
    getLatestLintReport(): LintReport | undefined;
    getTestReports(filter?: {
        status?: string;
        runner?: string;
        limit?: number;
    }): TestReport[];
    private handleTestReportResource;
    private handleLatestTestReportResource;
    private handleTestReportsListResource;
    private handleLintReportResource;
    private handleLatestLintReportResource;
    close(): Promise<void>;
}
//# sourceMappingURL=TestResources.d.ts.map