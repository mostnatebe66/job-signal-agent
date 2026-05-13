import { describe, it, expect } from 'vitest';
import { scoreJob } from '../src/services/scoreJob.js';
import type { NormalizedJob } from '../src/types/JobPosting.js';

const BASE_JOB: NormalizedJob = {
  id: 'abc123',
  source: 'builtin',
  searchTargetName: 'Senior Engineer',
  company: 'Acme Corp',
  title: 'Data Analyst',               // no title bonus
  location: 'Chicago, IL',             // no location bonus
  remoteType: 'onsite',                // no remote bonus
  url: 'https://builtin.com/job/1',
  datePosted: '2024-01-15',
  salaryRange: null,
  seniority: null,
  descriptionSnippet: null,
  topSkills: [],
  matchedKeywords: [],
  score: 0,
  firstSeenAt: '2024-01-01T00:00:00.000Z',
  lastSeenAt: '2024-01-20T00:00:00.000Z',
  scrapedAt: '2024-01-20T00:00:00.000Z',
};

/** Always resets location/remote/skills to neutral baseline unless overridden. */
function isolatedScore(overrides: Partial<NormalizedJob> = {}) {
  return scoreJob({
    ...BASE_JOB,
    title: 'Data Analyst',
    location: 'Chicago, IL',
    remoteType: 'onsite',
    topSkills: [],
    descriptionSnippet: null,
    seniority: null,
    ...overrides,
  });
}

describe('scoreJob', () => {

  // ---- return shape -------------------------------------------------------

  describe('return shape', () => {
    it('returns a NormalizedJob with a numeric score', () => {
      expect(typeof isolatedScore().score).toBe('number');
    });

    it('returns matchedKeywords as an array', () => {
      expect(Array.isArray(isolatedScore().matchedKeywords)).toBe(true);
    });

    it('preserves all non-score fields unchanged', () => {
      const result = isolatedScore();
      expect(result.id).toBe(BASE_JOB.id);
      expect(result.company).toBe(BASE_JOB.company);
      expect(result.source).toBe(BASE_JOB.source);
    });

    it('scores 0 for a job with no matching signals', () => {
      expect(isolatedScore().score).toBe(0);
    });
  });

  // ---- title scoring -------------------------------------------------------

  describe('title scoring', () => {
    it('adds 5+2=7 for "senior software engineer" (matches two if-checks)', () => {
      expect(isolatedScore({ title: 'Senior Software Engineer' }).score).toBe(7);
    });

    it('adds 4 for "senior full stack"', () => {
      expect(isolatedScore({ title: 'Senior Full Stack Developer' }).score).toBe(4);
    });

    it('adds 4 for "senior full-stack" (hyphenated)', () => {
      expect(isolatedScore({ title: 'Senior Full-Stack Engineer' }).score).toBe(4);
    });

    it('adds 4 for "senior frontend"', () => {
      expect(isolatedScore({ title: 'Senior Frontend Engineer' }).score).toBe(4);
    });

    it('adds 4 for "senior front end" (spaced)', () => {
      expect(isolatedScore({ title: 'Senior Front End Engineer' }).score).toBe(4);
    });

    it('adds 3 for "platform engineer"', () => {
      expect(isolatedScore({ title: 'Platform Engineer' }).score).toBe(3);
    });

    it('adds 2 for "software engineer"', () => {
      expect(isolatedScore({ title: 'Software Engineer' }).score).toBe(2);
    });

    it('adds 0 for an unrecognized title', () => {
      expect(isolatedScore({ title: 'Data Analyst' }).score).toBe(0);
    });

    it('is case-insensitive', () => {
      expect(isolatedScore({ title: 'SENIOR SOFTWARE ENGINEER' }).score).toBe(
        isolatedScore({ title: 'senior software engineer' }).score,
      );
    });
  });

  // ---- penalty keywords ---------------------------------------------------

  describe('penalty keywords (−4 each)', () => {
    it('subtracts 4 for "staff" in title', () => {
      expect(isolatedScore({ title: 'Staff Engineer' }).score).toBe(-4);
    });

    it('subtracts 4 for "principal" in title', () => {
      expect(isolatedScore({ title: 'Principal Engineer' }).score).toBe(-4);
    });

    it('stacks penalty with title bonus: "staff software engineer" = 2 − 4 = −2', () => {
      expect(isolatedScore({ title: 'Staff Software Engineer' }).score).toBe(-2);
    });

    it('does not penalize titles without penalty keywords', () => {
      expect(isolatedScore({ title: 'Senior Software Engineer' }).score).toBeGreaterThan(0);
    });
  });

  // ---- keyword scoring ----------------------------------------------------

  describe('keyword scoring', () => {
    it.each(['typescript', 'react', 'node'])(
      'adds 3 for tier-1 keyword "%s"',
      (keyword) => {
        const result = isolatedScore({ topSkills: [keyword] });
        expect(result.matchedKeywords).toContain(keyword);
        expect(result.score).toBe(3);
      },
    );

    it('adds 6 for "node.js" — substring match also triggers "node" (+3+3)', () => {
      // searchable.includes('node') is true when 'node.js' is in topSkills,
      // so both tier-1 keywords fire. Current behavior: 6.
      const result = isolatedScore({ topSkills: ['node.js'] });
      expect(result.matchedKeywords).toContain('node.js');
      expect(result.matchedKeywords).toContain('node');
      expect(result.score).toBe(6);
    });

    it.each(['aws', 'graphql', 'postgres', 'microservices', 'ai', 'llm', 'automation'])(
      'adds 2 for tier-2 keyword "%s"',
      (keyword) => {
        const result = isolatedScore({ topSkills: [keyword] });
        expect(result.matchedKeywords).toContain(keyword);
        expect(result.score).toBe(2);
      },
    );

    it('adds 4 for "postgresql" — substring match also triggers "postgres" (+2+2)', () => {
      const result = isolatedScore({ topSkills: ['postgresql'] });
      expect(result.matchedKeywords).toContain('postgresql');
      expect(result.matchedKeywords).toContain('postgres');
      expect(result.score).toBe(4);
    });

    it.each(['javascript', 'nestjs', 'playwright'])(
      'adds 1 for tier-3 keyword "%s" (in skillKeywords but not tier-1/2)',
      (keyword) => {
        const result = isolatedScore({ topSkills: [keyword] });
        expect(result.matchedKeywords).toContain(keyword);
        expect(result.score).toBe(1);
      },
    );

    it('does not match keywords absent from skillKeywords', () => {
      const result = isolatedScore({ topSkills: ['cobol', 'fortran'] });
      expect(result.matchedKeywords).toHaveLength(0);
      expect(result.score).toBe(0);
    });

    it('matches keywords found in descriptionSnippet', () => {
      const result = isolatedScore({ descriptionSnippet: 'Strong typescript experience required.' });
      expect(result.matchedKeywords).toContain('typescript');
      expect(result.score).toBe(3);
    });

    it('matches keywords found in seniority field', () => {
      const result = isolatedScore({ seniority: 'node experience preferred' });
      expect(result.matchedKeywords).toContain('node');
    });

    it('deduplicates matchedKeywords when keyword appears multiple times', () => {
      const result = isolatedScore({ topSkills: ['react', 'react'] });
      expect(result.matchedKeywords.filter((k) => k === 'react')).toHaveLength(1);
    });
  });

  // ---- location / remote scoring ------------------------------------------

  describe('location and remote scoring', () => {
    it('adds 3 when remoteType is "remote"', () => {
      expect(isolatedScore({ remoteType: 'remote' }).score).toBe(3);
    });

    it('adds 3 when location string contains "remote"', () => {
      expect(isolatedScore({ location: 'Remote - US' }).score).toBe(3);
    });

    it('adds 3 when location contains "austin"', () => {
      expect(isolatedScore({ location: 'Austin, TX' }).score).toBe(3);
    });

    it('adds 3+2=5 for hybrid+Austin (both location checks fire independently)', () => {
      expect(isolatedScore({ remoteType: 'hybrid', location: 'Austin, TX' }).score).toBe(5);
    });

    it('adds 0 for onsite in a non-Austin, non-remote city', () => {
      expect(isolatedScore({ remoteType: 'onsite', location: 'Chicago, IL' }).score).toBe(0);
    });

    it('location matching is case-insensitive', () => {
      expect(isolatedScore({ location: 'AUSTIN, TX' }).score).toBe(
        isolatedScore({ location: 'austin, tx' }).score,
      );
    });
  });

  // ---- score accumulation -------------------------------------------------

  describe('score accumulation', () => {
    it('correctly adds title + keyword + remote bonuses', () => {
      const result = isolatedScore({
        title: 'Senior Software Engineer',
        remoteType: 'remote',
        topSkills: ['typescript'],
      });
      expect(result.score).toBe(13);
    });

    it('penalty reduces an otherwise-positive score', () => {
      const result = isolatedScore({
        title: 'Staff Software Engineer',
        remoteType: 'remote',
        topSkills: ['typescript'],
      });
      expect(result.score).toBe(4);
    });

    it('score is always a finite number', () => {
      expect(isFinite(isolatedScore().score)).toBe(true);
    });
  });
});
