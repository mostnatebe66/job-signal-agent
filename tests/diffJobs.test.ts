import { describe, expect, it } from 'vitest';
import { diffJobs } from '../src/services/diffJobs.js';
import type { NormalizedJob } from '../src/types/JobPosting.js';

const baseJob: NormalizedJob = {
  id: '1',
  source: 'builtin',
  searchTargetName: 'Austin Senior Software Engineer',
  company: 'Example Co',
  title: 'Senior Software Engineer',
  location: 'Austin, TX',
  remoteType: 'hybrid',
  url: 'https://example.com/job/1',
  datePosted: null,
  salaryRange: null,
  seniority: 'Senior',
  descriptionSnippet: null,
  topSkills: ['TypeScript'],
  matchedKeywords: ['typescript'],
  score: 10,
  firstSeenAt: '2026-05-06T00:00:00.000Z',
  lastSeenAt: '2026-05-06T00:00:00.000Z',
  scrapedAt: '2026-05-06T00:00:00.000Z',
};

describe('diffJobs', () => {
  it('detects new, removed, and changed jobs', () => {
    const changed = { ...baseJob, score: 11, scrapedAt: '2026-05-07T00:00:00.000Z' };
    const newJob = { ...baseJob, id: '2', title: 'Senior Full Stack Engineer' };
    const removed = { ...baseJob, id: '3', title: 'Frontend Engineer' };

    const result = diffJobs([baseJob, removed], [changed, newJob]);

    expect(result.newJobs).toHaveLength(1);
    expect(result.removedJobs).toHaveLength(1);
    expect(result.changedJobs).toHaveLength(1);
    expect(result.changedJobs[0].changedFields).toContain('score');
  });
});
