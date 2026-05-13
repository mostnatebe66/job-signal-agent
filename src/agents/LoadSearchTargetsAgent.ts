import { searchTargets } from '../config/searchTargets.js';
import type { SearchTarget } from '../types/SearchTarget.js';
import { logger } from '../utils/logger.js';

export class LoadSearchTargetsAgent {
  async run(): Promise<SearchTarget[]> {
    logger.info(`Loaded ${searchTargets.length} search targets`);
    return searchTargets;
  }
}
