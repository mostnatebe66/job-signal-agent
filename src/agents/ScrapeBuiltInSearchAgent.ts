import { chromium } from '@playwright/test';
import { scraperConfig } from '../config/scraperConfig.js';
import { BuiltInScraper } from '../scrapers/builtinScraper.js';
import type { RawJobPosting, TargetRunResult } from '../types/JobPosting.js';
import type { SearchTarget } from '../types/SearchTarget.js';
import { logger } from '../utils/logger.js';

export class ScrapeBuiltInSearchAgent {
  async run(targets: SearchTarget[]): Promise<{ rawJobs: RawJobPosting[]; targetResults: TargetRunResult[] }> {
    const browser = await chromium.launch({ headless: scraperConfig.headless });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    });

    const scraper = new BuiltInScraper({ maxCardsPerSearchTarget: scraperConfig.maxCardsPerSearchTarget });
    const rawJobs: RawJobPosting[] = [];
    const targetResults: TargetRunResult[] = [];

    try {
      for (const target of targets) {
        const page = await context.newPage();
        try {
          logger.info(`Scraping target: ${target.name}`);
          const jobs = await scraper.scrapeSearchTarget(page, target);
          rawJobs.push(...jobs);
          targetResults.push({
            targetName: target.name,
            success: true,
            jobsFound: jobs.length,
            matchingJobs: 0,
          });
          logger.info(`Scraped ${jobs.length} raw jobs from ${target.name}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          targetResults.push({
            targetName: target.name,
            success: false,
            jobsFound: 0,
            matchingJobs: 0,
            error: message,
          });
          logger.error(`Failed target: ${target.name}`, { error: message });

          if (!scraperConfig.continueOnTargetFailure) throw error;
        } finally {
          await page.close().catch(() => undefined);
        }

        await new Promise((resolve) => setTimeout(resolve, scraperConfig.delayBetweenTargetsMs));
      }
    } finally {
      await browser.close();
    }

    return { rawJobs, targetResults };
  }
}
