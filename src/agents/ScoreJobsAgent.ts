import { scoreJob } from '../services/scoreJob.js';
import type { NormalizedJob } from '../types/JobPosting.js';
import { logger } from '../utils/logger.js';

export class ScoreJobsAgent {
  async run(jobs: NormalizedJob[]): Promise<NormalizedJob[]> {
    const scored = jobs.map(scoreJob).sort((a, b) => b.score - a.score);
    logger.info(`Scored ${scored.length} jobs`);
    return scored;
  }
}
