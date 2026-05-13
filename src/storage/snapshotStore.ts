import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NormalizedJob } from '../types/JobPosting.js';

const snapshotsDir = path.resolve('data/snapshots');
const latestPath = path.join(snapshotsDir, 'latest.json');

export async function readLatestSnapshot(): Promise<NormalizedJob[]> {
  try {
    const contents = await readFile(latestPath, 'utf8');
    return JSON.parse(contents) as NormalizedJob[];
  } catch {
    return [];
  }
}

export async function writeSnapshot(jobs: NormalizedJob[], runId: string): Promise<void> {
  await mkdir(snapshotsDir, { recursive: true });
  const serialized = JSON.stringify(jobs, null, 2);
  await writeFile(latestPath, serialized, 'utf8');
  await writeFile(path.join(snapshotsDir, `${runId}.json`), serialized, 'utf8');
}
