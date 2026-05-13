import 'dotenv/config';
import { JobSearchOrchestrator } from './JobSearchOrchestrator.js';
import { logger } from './utils/logger.js';

const orchestrator = new JobSearchOrchestrator();

orchestrator.run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('Job Signal Agent failed', { error: message });
  process.exitCode = 1;
});
