import { penaltyTitleKeywords, skillKeywords } from '../config/roleCriteria.js';
import type { NormalizedJob } from '../types/JobPosting.js';
import { unique } from '../utils/text.js';

export function scoreJob(job: NormalizedJob): NormalizedJob {
  const searchable = [
    job.title,
    job.company,
    job.location,
    job.descriptionSnippet ?? '',
    job.seniority ?? '',
    ...job.topSkills,
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  const title = job.title.toLowerCase();

  if (title.includes('senior software engineer')) score += 5;
  if (title.includes('senior full stack') || title.includes('senior full-stack')) score += 4;
  if (title.includes('senior frontend') || title.includes('senior front end')) score += 4;
  if (title.includes('platform engineer')) score += 3;
  if (title.includes('software engineer')) score += 2;

  const matchedKeywords = skillKeywords.filter((keyword) => searchable.includes(keyword.toLowerCase()));

  for (const keyword of matchedKeywords) {
    if (['typescript', 'react', 'node', 'node.js'].includes(keyword)) score += 3;
    else if (['aws', 'graphql', 'postgresql', 'postgres', 'microservices', 'ai', 'llm', 'automation'].includes(keyword)) score += 2;
    else score += 1;
  }

  if (job.remoteType === 'remote' || job.location.toLowerCase().includes('remote')) score += 3;
  if (job.location.toLowerCase().includes('austin')) score += 3;
  if (job.remoteType === 'hybrid' && job.location.toLowerCase().includes('austin')) score += 2;

  for (const penalty of penaltyTitleKeywords) {
    if (title.includes(penalty)) score -= 4;
  }

  return {
    ...job,
    matchedKeywords: unique(matchedKeywords),
    score,
  };
}
