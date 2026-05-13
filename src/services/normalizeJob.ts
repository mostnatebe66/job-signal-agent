import type { NormalizedJob, RawJobPosting } from '../types/JobPosting.js';
import { stableHash } from '../utils/hash.js';
import { cleanText, unique } from '../utils/text.js';

export function normalizeJob(raw: RawJobPosting, previousById: Map<string, NormalizedJob>): NormalizedJob | null {
  const title = cleanText(raw.title);
  const company = cleanText(raw.company);

  if (!title || !company) {
    return null;
  }

  const location = cleanText(raw.location) || 'Unknown';
  const id = stableHash(`${raw.source}|${company}|${title}|${location}|${raw.url ?? ''}`);
  const previous = previousById.get(id);

  return {
    id,
    source: raw.source,
    searchTargetName: raw.searchTargetName,
    company,
    title,
    location,
    remoteType: raw.remoteType,
    url: raw.url,
    datePosted: cleanNullable(raw.datePosted),
    salaryRange: cleanNullable(raw.salaryRange),
    seniority: cleanNullable(raw.seniority),
    descriptionSnippet: cleanNullable(raw.descriptionSnippet),
    topSkills: unique(raw.topSkills),
    matchedKeywords: [],
    score: 0,
    firstSeenAt: previous?.firstSeenAt ?? raw.scrapedAt,
    lastSeenAt: raw.scrapedAt,
    scrapedAt: raw.scrapedAt,
  };
}

function cleanNullable(value: string | null): string | null {
  const cleaned = cleanText(value);
  return cleaned.length > 0 ? cleaned : null;
}
