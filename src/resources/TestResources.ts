import { logger } from "../utils/logger.js";
import type { MCPDebuggerConfig, TestReport, LintReport, MCPResourceResult } from "../types/index.js";

export class TestResources {
  private config: MCPDebuggerConfig;
  private testReports: Map<string, TestReport> = new Map();
  private lintReports: Map<string, LintReport> = new Map();

  constructor(config: MCPDebuggerConfig) {
    this.config = config;
  }

  registerResources(_server: any): void {
    logger.debug("Test resources registered (simplified for now)");
  }

  // Public methods for report management (used by tools)
  addTestReport(report: TestReport): void {
    this.testReports.set(report.id, report);
    logger.debug("Test report added", { reportId: report.id, status: report.status });
  }

  addLintReport(report: LintReport): void {
    this.lintReports.set(report.id, report);
    logger.debug("Lint report added", { reportId: report.id, status: report.status });
  }

  getTestReport(reportId: string): TestReport | undefined {
    return this.testReports.get(reportId);
  }

  getLintReport(reportId: string): LintReport | undefined {
    return this.lintReports.get(reportId);
  }

  getLatestTestReport(): TestReport | undefined {
    const reports = Array.from(this.testReports.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    return reports[0];
  }

  getLatestLintReport(): LintReport | undefined {
    const reports = Array.from(this.lintReports.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    return reports[0];
  }

  getTestReports(filter?: { status?: string; runner?: string; limit?: number }): TestReport[] {
    let reports = Array.from(this.testReports.values());

    if (filter?.status) {
      reports = reports.filter(r => r.status === filter.status);
    }

    if (filter?.runner) {
      reports = reports.filter(r => r.runner === filter.runner);
    }

    // Sort by start time (newest first)
    reports.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (filter?.limit) {
      reports = reports.slice(0, filter.limit);
    }

    return reports;
  }

  private async handleTestReportResource(
    uri: URL,
    params: Record<string, string>
  ): Promise<MCPResourceResult> {
    try {
      const reportId = params.reportId;
      if (!reportId) {
        throw new Error("Missing required parameter: reportId");
      }

      const report = this.getTestReport(reportId);
      if (!report) {
        throw new Error(`Test report not found: ${reportId}`);
      }

      const reportData = {
        id: report.id,
        sessionId: report.sessionId,
        runner: report.runner,
        target: report.target,
        status: report.status,
        startTime: report.startTime.toISOString(),
        endTime: report.endTime?.toISOString(),
        duration: report.endTime ? report.endTime.getTime() - report.startTime.getTime() : undefined,
        summary: report.summary,
        failures: report.failures.slice(0, 50), // Limit failures for performance
        output: report.output.slice(-this.config.maxOutputBytes), // Limit output size
        errorOutput: report.errorOutput.slice(-this.config.maxOutputBytes)
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(reportData, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error handling test report resource", { error, uri: uri.href, params });
      throw error;
    }
  }

  private async handleLatestTestReportResource(uri: URL): Promise<MCPResourceResult> {
    try {
      const report = this.getLatestTestReport();

      if (!report) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ message: "No test reports available" }, null, 2)
          }]
        };
      }

      // Reuse the same logic as individual report
      const params = { reportId: report.id };
      return this.handleTestReportResource(uri, params);
    } catch (error) {
      logger.error("Error handling latest test report resource", { error, uri: uri.href });
      throw error;
    }
  }

  private async handleTestReportsListResource(
    uri: URL,
    params: Record<string, string>
  ): Promise<MCPResourceResult> {
    try {
      const filter = {
        status: params.status,
        runner: params.runner,
        limit: params.limit ? parseInt(params.limit, 10) : 10
      };

      const reports = this.getTestReports(filter).map(report => ({
        id: report.id,
        sessionId: report.sessionId,
        runner: report.runner,
        target: report.target,
        status: report.status,
        startTime: report.startTime.toISOString(),
        duration: report.endTime ? report.endTime.getTime() - report.startTime.getTime() : undefined,
        summary: report.summary
      }));

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({ reports }, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error handling test reports list resource", { error, uri: uri.href, params });
      throw error;
    }
  }

  private async handleLintReportResource(
    uri: URL,
    params: Record<string, string>
  ): Promise<MCPResourceResult> {
    try {
      const reportId = params.reportId;
      if (!reportId) {
        throw new Error("Missing required parameter: reportId");
      }

      const report = this.getLintReport(reportId);
      if (!report) {
        throw new Error(`Lint report not found: ${reportId}`);
      }

      const reportData = {
        id: report.id,
        sessionId: report.sessionId,
        tool: report.tool,
        paths: report.paths,
        status: report.status,
        startTime: report.startTime.toISOString(),
        endTime: report.endTime?.toISOString(),
        duration: report.endTime ? report.endTime.getTime() - report.startTime.getTime() : undefined,
        issues: report.issues.slice(0, 100), // Limit issues for performance
        output: report.output.slice(-this.config.maxOutputBytes),
        errorOutput: report.errorOutput.slice(-this.config.maxOutputBytes)
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(reportData, null, 2)
        }]
      };
    } catch (error) {
      logger.error("Error handling lint report resource", { error, uri: uri.href, params });
      throw error;
    }
  }

  private async handleLatestLintReportResource(uri: URL): Promise<MCPResourceResult> {
    try {
      const report = this.getLatestLintReport();

      if (!report) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ message: "No lint reports available" }, null, 2)
          }]
        };
      }

      // Reuse the same logic as individual report
      const params = { reportId: report.id };
      return this.handleLintReportResource(uri, params);
    } catch (error) {
      logger.error("Error handling latest lint report resource", { error, uri: uri.href });
      throw error;
    }
  }

  async close(): Promise<void> {
    // Cleanup reports
    this.testReports.clear();
    this.lintReports.clear();
    logger.debug("Test resources closed");
  }
}
