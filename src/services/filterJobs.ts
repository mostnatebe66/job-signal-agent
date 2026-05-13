import {
  allowedLocationKeywords,
  hardExcludeTitleKeywords,
  includeTitleKeywords,
} from '../config/roleCriteria.js';
import type { NormalizedJob } from '../types/JobPosting.js';
import { includesAny } from '../utils/text.js';

export function isMatchingJob(job: NormalizedJob): boolean {
  const title = job.title.toLowerCase();
  const location = job.location.toLowerCase();

  if (includesAny(title, hardExcludeTitleKeywords)) return false;
  if (!includesAny(title, includeTitleKeywords)) return false;

  const isRemote = job.remoteType === 'remote' || location.includes('remote');
  const isHybridAustin = job.remoteType === 'hybrid' && location.includes('austin');
  const isAustin = location.includes('austin');
  const allowedLocation = isRemote || isHybridAustin || isAustin || includesAny(location, allowedLocationKeywords);

  return allowedLocation;
}
