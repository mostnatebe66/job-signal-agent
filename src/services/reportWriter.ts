import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DiffResult, NormalizedJob, TargetRunResult } from '../types/JobPosting.js';

export async function writeMarkdownReport(args: {
  runId: string;
  jobs: NormalizedJob[];
  diff: DiffResult;
  targetResults: TargetRunResult[];
}): Promise<string> {
  const reportsDir = path.resolve('data/reports');
  await mkdir(reportsDir, { recursive: true });

  const report = buildReport(args);
  const reportPath = path.join(reportsDir, `job-signal-report-${args.runId}.md`);
  await writeFile(reportPath, report, 'utf8');
  return reportPath;
}

function buildReport({ runId, jobs, diff, targetResults }: {
  runId: string;
  jobs: NormalizedJob[];
  diff: DiffResult;
  targetResults: TargetRunResult[];
}): string {
  const topMatches = [...jobs].sort((a, b) => b.score - a.score).slice(0, 15);
  const failedTargets = targetResults.filter((result) => !result.success);

  return [
    `# Job Signal Report`,
    '',
    `Run ID: ${runId}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    `## Summary`,
    '',
    `- Sources checked: ${targetResults.length}`,
    `- Matching jobs: ${jobs.length}`,
    `- New jobs: ${diff.newJobs.length}`,
    `- Changed jobs: ${diff.changedJobs.length}`,
    `- Removed jobs: ${diff.removedJobs.length}`,
    `- Failed targets: ${failedTargets.length}`,
    '',
    `## Target Results`,
    '',
    ...targetResults.map((result) =>
      `- ${result.success ? '✅' : '❌'} ${result.targetName}: ${result.matchingJobs}/${result.jobsFound} matching${result.error ? ` — ${result.error}` : ''}`,
    ),
    '',
    `## Top Matches`,
    '',
    renderJobList(topMatches),
    '',
    `## New Matches`,
    '',
    renderJobList(diff.newJobs.sort((a, b) => b.score - a.score)),
    '',
    `## Changed Matches`,
    '',
    renderChangedJobs(diff.changedJobs),
    '',
    `## Removed Since Last Run`,
    '',
    renderJobList(diff.removedJobs),
    '',
  ].join('\n');
}

function renderJobList(jobs: NormalizedJob[]): string {
  if (jobs.length === 0) return '_None._';

  return jobs
    .map((job, index) => {
      const lines = [
        `${index + 1}. **${job.title}** — ${job.company}`,
        `   - Score: ${job.score}`,
        `   - Location: ${job.location} (${job.remoteType})`,
        `   - Matched: ${job.matchedKeywords.length ? job.matchedKeywords.join(', ') : 'None'}`,
      ];

      if (job.salaryRange) lines.push(`   - Salary: ${job.salaryRange}`);
      if (job.seniority) lines.push(`   - Seniority: ${job.seniority}`);
      if (job.url) lines.push(`   - URL: ${job.url}`);
      if (job.descriptionSnippet) lines.push(`   - Notes: ${job.descriptionSnippet}`);

      return lines.join('\n');
    })
    .join('\n\n');
}

function renderChangedJobs(changedJobs: DiffResult['changedJobs']): string {
  if (changedJobs.length === 0) return '_None._';

  return changedJobs
    .map(({ after, changedFields }, index) => {
      return [
        `${index + 1}. **${after.title}** — ${after.company}`,
        `   - Changed fields: ${changedFields.join(', ')}`,
        `   - Score: ${after.score}`,
        after.url ? `   - URL: ${after.url}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}
