import { diffJobs } from '../services/diffJobs.js';
import type { DiffResult, NormalizedJob } from '../types/JobPosting.js';
import { logger } from '../utils/logger.js';

export class DiffJobsAgent {
  async run(previousJobs: NormalizedJob[], currentJobs: NormalizedJob[]): Promise<DiffResult> {
    const diff = diffJobs(previousJobs, currentJobs);
    logger.info('Computed job diff', {
      new: diff.newJobs.length,
      changed: diff.changedJobs.length,
      removed: diff.removedJobs.length,
      unchanged: diff.unchangedJobs.length,
    });
    return diff;
  }
}
