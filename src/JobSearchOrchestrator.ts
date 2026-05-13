import { DiffJobsAgent } from './agents/DiffJobsAgent.js';
import { FilterJobsAgent } from './agents/FilterJobsAgent.js';
import { LoadSearchTargetsAgent } from './agents/LoadSearchTargetsAgent.js';
import { NormalizeJobsAgent } from './agents/NormalizeJobsAgent.js';
import { ReportAgent } from './agents/ReportAgent.js';
import { ScoreJobsAgent } from './agents/ScoreJobsAgent.js';
import { ScrapeBuiltInSearchAgent } from './agents/ScrapeBuiltInSearchAgent.js';
import { readLatestSnapshot, writeSnapshot } from './storage/snapshotStore.js';
import { logger } from './utils/logger.js';

export class JobSearchOrchestrator {
  private readonly loadSearchTargetsAgent = new LoadSearchTargetsAgent();
  private readonly scrapeBuiltInSearchAgent = new ScrapeBuiltInSearchAgent();
  private readonly normalizeJobsAgent = new NormalizeJobsAgent();
  private readonly filterJobsAgent = new FilterJobsAgent();
  private readonly scoreJobsAgent = new ScoreJobsAgent();
  private readonly diffJobsAgent = new DiffJobsAgent();
  private readonly reportAgent = new ReportAgent();

  async run(): Promise<void> {
    const runId = buildRunId();
    logger.info(`Starting Job Signal Agent run: ${runId}`);

    const previousJobs = await readLatestSnapshot();
    const targets = await this.loadSearchTargetsAgent.run();
    const { rawJobs, targetResults } = await this.scrapeBuiltInSearchAgent.run(targets);
    const normalizedJobs = await this.normalizeJobsAgent.run(rawJobs, previousJobs);
    const filteredJobs = await this.filterJobsAgent.run(normalizedJobs, targetResults);
    const scoredJobs = await this.scoreJobsAgent.run(filteredJobs);
    const diff = await this.diffJobsAgent.run(previousJobs, scoredJobs);
    const reportPath = await this.reportAgent.run({ runId, jobs: scoredJobs, diff, targetResults });

    await writeSnapshot(scoredJobs, runId);

    logger.info('Job Signal Agent complete', {
      runId,
      reportPath,
      jobs: scoredJobs.length,
      newJobs: diff.newJobs.length,
    });
  }
}

function buildRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
