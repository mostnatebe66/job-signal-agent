# Job Signal Agent

A TypeScript/Node.js Playwright batch job that monitors narrowly scoped Built In search URLs, extracts Austin/remote software engineering roles, scores them against a configurable skill profile, compares results against the previous run, and generates a Markdown report.

This is intentionally built as a **personal saved-search monitor**, not a bulk job-board scraper. It visits a small set of manually configured public search URLs and caps the number of job cards processed per run.

## What it demonstrates

- TypeScript + Node.js project structure
- Playwright browser automation
- Agent-style orchestration without an LLM dependency
- Modular scraper/normalizer/filter/scorer/diff/report workflow
- Defensive extraction from expandable job cards
- Snapshot-based change detection
- Markdown report generation
- Failure isolation so one bad search target does not stop the whole run

## MVP behavior

The agent currently:

1. Visits 3 manually configured Built In search URLs.
2. Extracts visible job cards.
3. Attempts to expand each job card before reading details.
4. Normalizes company/title/location/url and optional fields.
5. Filters for Austin/remote senior engineering roles.
6. Scores jobs based on title, location, and skill keywords.
7. Compares against the previous snapshot.
8. Generates a Markdown report.
9. Continues to the next target if one target fails.

## Search targets

Configured in `src/config/searchTargets.ts`:

- Austin Senior Software Engineer
- Austin Full Stack Engineer
- Austin Frontend Engineer

## Setup

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm run job-agent-search
```

Debug mode with a visible browser:

```bash
npm run job-agent-search:debug
```

## Output

The agent writes:

```text
data/snapshots/latest.json
data/snapshots/<timestamp>.json
data/reports/job-signal-report-<timestamp>.md
```

The report includes:

- summary counts
- target status
- top matches
- new matches
- changed matches
- removed jobs

## Configuration

Optional environment variables:

```bash
JOB_AGENT_HEADLESS=true
JOB_AGENT_MAX_CARDS=25
```

See `.env.example`.

## Agent workflow

```text
JobSearchOrchestrator
  -> LoadSearchTargetsAgent
  -> ScrapeBuiltInSearchAgent
  -> NormalizeJobsAgent
  -> FilterJobsAgent
  -> ScoreJobsAgent
  -> DiffJobsAgent
  -> ReportAgent
```

The word “agent” here means a small, focused worker with a clear input/output contract. The MVP does not require external LLM calls. A later version could add an optional LLM summary agent to explain role fit.

## Notes on respectful use

This project is scoped for personal monitoring of a few public search pages. It does not log in, bypass access controls, scrape private user data, or crawl the site broadly. Keep request volume low and review the target site’s terms before running scheduled jobs.

## Future improvements

- Detail-page enrichment for deeper descriptions
- SQLite persistence
- GitHub Actions scheduled run
- Email summary
- Google Sheets export
- CLI flags for search target selection
- Optional LLM-based role-fit summary
- Unit tests for scraper parsing fixtures
