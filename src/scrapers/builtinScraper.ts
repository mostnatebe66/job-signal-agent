import type { Locator, Page } from '@playwright/test';
import type { RawJobPosting } from '../types/JobPosting.js';
import type { SearchTarget } from '../types/SearchTarget.js';
import { cleanText, unique } from '../utils/text.js';

type BuiltInScraperOptions = {
  maxCardsPerSearchTarget: number;
};

export class BuiltInScraper {
  constructor(private readonly options: BuiltInScraperOptions) {}

  async scrapeSearchTarget(page: Page, target: SearchTarget): Promise<RawJobPosting[]> {
    const scrapedAt = new Date().toISOString();

    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);

    const cards = await this.findJobCards(page);
    const limitedCards = cards.slice(0, this.options.maxCardsPerSearchTarget);
    const jobs: RawJobPosting[] = [];

    for (let index = 0; index < limitedCards.length; index += 1) {
      const card = limitedCards[index];
      await card.scrollIntoViewIfNeeded().catch(() => undefined);
      await this.expandCard(card).catch(() => undefined);
      const rawText = cleanText(await card.innerText().catch(() => ''));

      if (!rawText) continue;

      const link = await card.locator('a[href*="/job/"]').first().getAttribute('href').catch(() => null);
      const url = normalizeUrl(link);

      jobs.push({
        source: 'builtin',
        searchTargetName: target.name,
        rawText,
        company: await extractCompany(card, rawText),
        title: await extractTitle(card, rawText),
        location: extractLocation(rawText),
        remoteType: extractRemoteType(rawText),
        url,
        datePosted: extractDatePosted(rawText),
        salaryRange: extractSalaryRange(rawText),
        seniority: extractSeniority(rawText),
        descriptionSnippet: extractDescriptionSnippet(rawText),
        topSkills: extractTopSkills(rawText),
        scrapedAt,
      });
    }

    return jobs;
  }

  private async findJobCards(page: Page) {
    const candidates = [
      page.locator('[data-testid*="job-card"]'),
      page.locator('article:has(a[href*="/job/"])'),
      page.locator('div:has(> a[href*="/job/"])'),
      page.locator('li:has(a[href*="/job/"])'),
    ];

    for (const locator of candidates) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) return locator.all();
    }

    // Fallback: cards are sometimes rendered as nested containers with job links inside.
    const linkCount = await page.locator('a[href*="/job/"]').count().catch(() => 0);
    if (linkCount === 0) return [];

    return page.locator('a[href*="/job/"]').evaluateAll((links) => {
      return links
        .map((link) => link.closest('article, li, section, div'))
        .filter((element): element is Element => Boolean(element));
    }).then(async (_elements) => page.locator('a[href*="/job/"]').all());
  }

  private async expandCard(card: Locator): Promise<void> {
    const expandButtons = [
      card.locator('button[aria-expanded="false"]'),
      card.locator('button[aria-label*="Expand" i]'),
      card.locator('button:has-text("Show more")'),
      card.locator('button').filter({ hasText: /^$/ }),
    ];

    for (const button of expandButtons) {
      const count = await button.count().catch(() => 0);
      if (count > 0) {
        await button.first().click({ timeout: 5_000 }).catch(() => undefined);
        await card.page().waitForTimeout(250);
        return;
      }
    }
  }
}

async function extractTitle(card: Locator, rawText: string): Promise<string | null> {
  const text = await card.locator('a[href*="/job/"]').first().innerText().catch(() => null);
  if (text) return cleanText(text);

  const lines = rawText.split(/\n| {2,}/).map(cleanText).filter(Boolean);
  return lines.find((line) => /engineer|developer|architect/i.test(line)) ?? lines[0] ?? null;
}

async function extractCompany(card: Locator, rawText: string): Promise<string | null> {
  const companySelectors = [
    '[data-testid*="company"]',
    'a[href*="/company/"]',
    'span:has-text("Company")',
  ];

  for (const selector of companySelectors) {
    const text = await card.locator(selector).first().innerText().catch(() => null);
    if (text) return cleanText(text).replace(/^Company\s*/i, '');
  }

  const lines = rawText.split(/\n| {2,}/).map(cleanText).filter(Boolean);
  const titleIndex = lines.findIndex((line) => /engineer|developer|architect/i.test(line));
  if (titleIndex > 0) return lines[titleIndex - 1];
  return lines[0] ?? null;
}

function extractLocation(text: string): string {
  const matches = text.match(/(?:Austin,?\s*TX|Austin,?\s*Texas|Remote(?:\s*\(US\))?|United States|USA|Hybrid)/gi);
  return unique(matches ?? []).join(', ') || 'Unknown';
}

function extractRemoteType(text: string): RawJobPosting['remoteType'] {
  const normalized = text.toLowerCase();
  if (normalized.includes('remote')) return 'remote';
  if (normalized.includes('hybrid')) return 'hybrid';
  if (normalized.includes('onsite') || normalized.includes('on-site')) return 'onsite';
  return 'unknown';
}

function extractDatePosted(text: string): string | null {
  const match = text.match(/(?:posted|reposted|updated)\s+(?:\d+\s+\w+\s+ago|today|yesterday)|\d+\s+(?:hours?|days?|weeks?)\s+ago/iu);
  return match?.[0] ?? null;
}

function extractSalaryRange(text: string): string | null {
  const match = text.match(/\$\s?\d{2,3}(?:,\d{3})?\s?(?:k|K)?\s?[-–—]\s?\$?\s?\d{2,3}(?:,\d{3})?\s?(?:k|K)?/u);
  return match?.[0] ?? null;
}

function extractSeniority(text: string): string | null {
  const match = text.match(/\b(?:Senior|Mid-Level|Mid Level|Entry Level|Staff|Principal|Lead)\b/iu);
  return match?.[0] ?? null;
}

function extractDescriptionSnippet(text: string): string | null {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter((sentence) => sentence.length > 80 && sentence.length < 500);

  return sentences[0] ?? null;
}

function extractTopSkills(text: string): string[] {
  const knownSkills = [
    'TypeScript',
    'JavaScript',
    'React',
    'Node.js',
    'Node',
    'NestJS',
    'AWS',
    'GraphQL',
    'PostgreSQL',
    'SQL',
    'Microservices',
    'Playwright',
    'AI',
    'LLM',
    'Docker',
    'Kubernetes',
    'Java',
    'Spring',
    'Python',
  ];

  const normalized = text.toLowerCase();
  return knownSkills.filter((skill) => normalized.includes(skill.toLowerCase()));
}

function normalizeUrl(href: string | null): string | null {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  return `https://builtin.com${href}`;
}
