import { isMatchingJob } from '../services/filterJobs.js';
import type { NormalizedJob, TargetRunResult } from '../types/JobPosting.js';
import { logger } from '../utils/logger.js';

export class FilterJobsAgent {
  async run(jobs: NormalizedJob[], targetResults: TargetRunResult[]): Promise<NormalizedJob[]> {
    const matchingJobs = jobs.filter(isMatchingJob);
    const countByTarget = new Map<string, number>();

    for (const job of matchingJobs) {
      countByTarget.set(job.searchTargetName, (countByTarget.get(job.searchTargetName) ?? 0) + 1);
    }

    for (const result of targetResults) {
      result.matchingJobs = countByTarget.get(result.targetName) ?? 0;
    }

    logger.info(`Filtered to ${matchingJobs.length} matching jobs`);
    return matchingJobs;
  }
}
