import { normalizeJob } from '../services/normalizeJob.js';
import type { NormalizedJob, RawJobPosting } from '../types/JobPosting.js';
import { logger } from '../utils/logger.js';

export class NormalizeJobsAgent {
  async run(rawJobs: RawJobPosting[], previousJobs: NormalizedJob[]): Promise<NormalizedJob[]> {
    const previousById = new Map(previousJobs.map((job) => [job.id, job]));
    const normalized = rawJobs
      .map((rawJob) => normalizeJob(rawJob, previousById))
      .filter((job): job is NormalizedJob => Boolean(job));

    const deduped = [...new Map(normalized.map((job) => [job.id, job])).values()];
    logger.info(`Normalized ${deduped.length} jobs`);
    return deduped;
  }
}
