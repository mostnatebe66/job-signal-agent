import type { DiffResult, NormalizedJob } from '../types/JobPosting.js';

const trackedFields: Array<keyof NormalizedJob> = [
  'title',
  'company',
  'location',
  'remoteType',
  'url',
  'datePosted',
  'salaryRange',
  'seniority',
  'descriptionSnippet',
  'score',
];

export function diffJobs(previous: NormalizedJob[], current: NormalizedJob[]): DiffResult {
  const previousById = new Map(previous.map((job) => [job.id, job]));
  const currentById = new Map(current.map((job) => [job.id, job]));

  const newJobs = current.filter((job) => !previousById.has(job.id));
  const removedJobs = previous.filter((job) => !currentById.has(job.id));
  const changedJobs: DiffResult['changedJobs'] = [];
  const unchangedJobs: NormalizedJob[] = [];

  for (const job of current) {
    const before = previousById.get(job.id);
    if (!before) continue;

    const changedFields = trackedFields.filter((field) => JSON.stringify(before[field]) !== JSON.stringify(job[field]));
    if (changedFields.length > 0) {
      changedJobs.push({ before, after: job, changedFields: changedFields.map(String) });
    } else {
      unchangedJobs.push(job);
    }
  }

  return { newJobs, removedJobs, changedJobs, unchangedJobs };
}
