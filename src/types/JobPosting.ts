export type RemoteType = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export type RawJobPosting = {
  source: 'builtin';
  searchTargetName: string;
  rawText: string;
  company: string | null;
  title: string | null;
  location: string | null;
  remoteType: RemoteType;
  url: string | null;
  datePosted: string | null;
  salaryRange: string | null;
  seniority: string | null;
  descriptionSnippet: string | null;
  topSkills: string[];
  scrapedAt: string;
};

export type NormalizedJob = {
  id: string;
  source: 'builtin';
  searchTargetName: string;
  company: string;
  title: string;
  location: string;
  remoteType: RemoteType;
  url: string | null;
  datePosted: string | null;
  salaryRange: string | null;
  seniority: string | null;
  descriptionSnippet: string | null;
  topSkills: string[];
  matchedKeywords: string[];
  score: number;
  firstSeenAt: string;
  lastSeenAt: string;
  scrapedAt: string;
};

export type DiffResult = {
  newJobs: NormalizedJob[];
  removedJobs: NormalizedJob[];
  changedJobs: Array<{
    before: NormalizedJob;
    after: NormalizedJob;
    changedFields: string[];
  }>;
  unchangedJobs: NormalizedJob[];
};

export type TargetRunResult = {
  targetName: string;
  success: boolean;
  jobsFound: number;
  matchingJobs: number;
  error?: string;
};
