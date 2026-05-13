import { describe, it, expect } from 'vitest';
import { normalizeJob } from '../src/services/normalizeJob.js';
import type { RawJobPosting, NormalizedJob } from '../src/types/JobPosting.js';

const BASE_RAW: RawJobPosting = {
  source: 'builtin',
  searchTargetName: 'Senior Engineer',
  rawText: 'some raw text',
  company: 'Acme Corp',
  title: 'Senior Software Engineer',
  location: 'Austin, TX',
  remoteType: 'hybrid',
  url: 'https://builtin.com/job/123',
  datePosted: '2024-01-15',
  salaryRange: '$120k–$160k',
  seniority: 'Senior',
  descriptionSnippet: 'We are looking for a senior engineer.',
  topSkills: ['TypeScript', 'React', 'Node.js'],
  scrapedAt: '2024-01-20T00:00:00.000Z',
};

const EMPTY_PREVIOUS = new Map<string, NormalizedJob>();

function normalize(overrides: Partial<RawJobPosting> = {}, previous = EMPTY_PREVIOUS) {
  return normalizeJob({ ...BASE_RAW, ...overrides }, previous);
}

describe('normalizeJob', () => {

  describe('returns null for invalid inputs', () => {
    it('returns null when title is null', () => {
      expect(normalize({ title: null })).toBeNull();
    });

    it('returns null when title is an empty string', () => {
      expect(normalize({ title: '' })).toBeNull();
    });

    it('returns null when title is whitespace only', () => {
      expect(normalize({ title: '   ' })).toBeNull();
    });

    it('returns null when company is null', () => {
      expect(normalize({ company: null })).toBeNull();
    });

    it('returns null when company is an empty string', () => {
      expect(normalize({ company: '' })).toBeNull();
    });
  });

  describe('ID generation', () => {
    it('produces the same ID on repeated calls with identical input', () => {
      const a = normalize();
      const b = normalize();
      expect(a?.id).toBe(b?.id);
    });

    it('produces different IDs for different titles', () => {
      const a = normalize({ title: 'Senior Software Engineer' });
      const b = normalize({ title: 'Staff Engineer' });
      expect(a?.id).not.toBe(b?.id);
    });

    it('produces different IDs for different companies', () => {
      const a = normalize({ company: 'Acme Corp' });
      const b = normalize({ company: 'Globex' });
      expect(a?.id).not.toBe(b?.id);
    });

    it('produces different IDs for different locations', () => {
      const a = normalize({ location: 'Austin, TX' });
      const b = normalize({ location: 'New York, NY' });
      expect(a?.id).not.toBe(b?.id);
    });

    it('produces different IDs for different URLs', () => {
      const a = normalize({ url: 'https://builtin.com/job/1' });
      const b = normalize({ url: 'https://builtin.com/job/2' });
      expect(a?.id).not.toBe(b?.id);
    });
  });

  describe('location', () => {
    it('defaults to "Unknown" when location is null', () => {
      expect(normalize({ location: null })?.location).toBe('Unknown');
    });

    it('defaults to "Unknown" when location is an empty string', () => {
      expect(normalize({ location: '' })?.location).toBe('Unknown');
    });

    it('preserves a valid location string', () => {
      expect(normalize({ location: 'Austin, TX' })?.location).toBe('Austin, TX');
    });
  });

  describe('firstSeenAt', () => {
    it('uses scrapedAt as firstSeenAt for a new job', () => {
      const result = normalize();
      expect(result?.firstSeenAt).toBe(BASE_RAW.scrapedAt);
    });

    it('preserves the original firstSeenAt for a previously-seen job', () => {
      const first = normalize()!;
      const originalFirstSeen = '2024-01-01T00:00:00.000Z';
      const previousById = new Map([[first.id, { ...first, firstSeenAt: originalFirstSeen }]]);

      const result = normalize({ scrapedAt: '2024-01-25T00:00:00.000Z' }, previousById);
      expect(result?.firstSeenAt).toBe(originalFirstSeen);
    });

    it('updates lastSeenAt and scrapedAt on re-scrape', () => {
      const first = normalize()!;
      const newScrapedAt = '2024-01-25T00:00:00.000Z';
      const previousById = new Map([[first.id, first]]);

      const result = normalize({ scrapedAt: newScrapedAt }, previousById);
      expect(result?.lastSeenAt).toBe(newScrapedAt);
      expect(result?.scrapedAt).toBe(newScrapedAt);
    });
  });

  describe('initial score and matchedKeywords', () => {
    it('initializes score to 0', () => {
      expect(normalize()?.score).toBe(0);
    });

    it('initializes matchedKeywords to an empty array', () => {
      expect(normalize()?.matchedKeywords).toEqual([]);
    });
  });

  describe('topSkills', () => {
    it('deduplicates repeated skills', () => {
      const result = normalize({ topSkills: ['React', 'React', 'TypeScript'] });
      expect(result?.topSkills).toEqual(['React', 'TypeScript']);
    });

    it('preserves unique skills as-is', () => {
      const result = normalize({ topSkills: ['TypeScript', 'React', 'Node.js'] });
      expect(result?.topSkills).toEqual(['TypeScript', 'React', 'Node.js']);
    });

    it('handles an empty topSkills array', () => {
      expect(normalize({ topSkills: [] })?.topSkills).toEqual([]);
    });
  });

  describe('nullable fields', () => {
    it('coerces an empty salaryRange to null', () => {
      expect(normalize({ salaryRange: '' })?.salaryRange).toBeNull();
    });

    it('coerces an empty seniority to null', () => {
      expect(normalize({ seniority: '' })?.seniority).toBeNull();
    });

    it('coerces an empty descriptionSnippet to null', () => {
      expect(normalize({ descriptionSnippet: '' })?.descriptionSnippet).toBeNull();
    });

    it('coerces an empty datePosted to null', () => {
      expect(normalize({ datePosted: '' })?.datePosted).toBeNull();
    });

    it('passes through non-empty nullable fields', () => {
      const result = normalize();
      expect(result?.salaryRange).toBe('$120k–$160k');
      expect(result?.seniority).toBe('Senior');
      expect(result?.descriptionSnippet).toBe('We are looking for a senior engineer.');
      expect(result?.datePosted).toBe('2024-01-15');
    });

    it('passes through a null url as-is', () => {
      expect(normalize({ url: null })?.url).toBeNull();
    });
  });

  describe('passthrough fields', () => {
    it('carries source, searchTargetName, remoteType, and url through unchanged', () => {
      const result = normalize();
      expect(result?.source).toBe('builtin');
      expect(result?.searchTargetName).toBe('Senior Engineer');
      expect(result?.remoteType).toBe('hybrid');
      expect(result?.url).toBe('https://builtin.com/job/123');
    });
  });
});
