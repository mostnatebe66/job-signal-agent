import { writeMarkdownReport } from '../services/reportWriter.js';
import type { DiffResult, NormalizedJob, TargetRunResult } from '../types/JobPosting.js';
import { logger } from '../utils/logger.js';

export class ReportAgent {
  async run(args: {
    runId: string;
    jobs: NormalizedJob[];
    diff: DiffResult;
    targetResults: TargetRunResult[];
  }): Promise<string> {
    const reportPath = await writeMarkdownReport(args);
    logger.info(`Wrote Markdown report: ${reportPath}`);
    return reportPath;
  }
}
