# job-signal-agent

A TypeScript CLI that monitors narrowly-scoped Built In job searches, scores matching roles against personal criteria, diffs results against prior runs, and generates Markdown reports. Personal tool — runs locally, no server, no UI.

## Status: mid-refactor

The codebase has architectural duplication (`agents/` + `services/`) and an over-engineered orchestrator that we are actively collapsing. When in doubt, work *toward* the target architecture below, not away from it. See [Refactor roadmap](#refactor-roadmap) for the ordered backlog.

## How to run

```bash
npm install
cp .env.example .env

npm run job-agent-search          # main entry
npm run job-agent-search:debug    # runs Playwright headful (while Playwright still in use)
npm run typecheck
npm run lint
npm run test                      # vitest
npm run format
```

Reports land in `data/reports/`. Snapshots (state between runs) live in `data/snapshots/`.

## Tech stack

- **Runtime:** Node.js 22+, ESM (`"type": "module"`), TypeScript 5.7
- **Runner:** `tsx` for direct TS execution — no build step
- **Testing:** Vitest
- **Lint/format:** ESLint flat config + Prettier
- **Scraping:** Playwright (under review — see refactor item 2)
- **Config:** `dotenv` for env vars; static config under `src/config/*.ts`

## Pipeline

The app is a 7-step linear pipeline. New work preserves this shape:

```
loadSearchTargets → scrapeBuiltIn → normalizeJobs → filterJobs
                                                          ↓
                writeReport ← diffJobs ← scoreJobs ← ─────┘
```

Each step takes input, returns output, has no side effects beyond what its name implies. State between runs flows through `storage/snapshotStore.ts`.

## Architecture

### Current structure

```
src/
  agents/                    # wrap services/, mostly redundant — being removed
  services/                  # actual step implementations
  scrapers/                  # Built In scraper (separate from agents/services)
  config/                    # role criteria, scraper config, search targets
  storage/                   # snapshotStore.ts (JSON-on-disk)
  types/                     # JobPosting, SearchTarget
  utils/                     # hash, logger, text helpers
  JobSearchOrchestrator.ts   # class wrapping the pipeline — being replaced
  index.ts                   # bootstraps the orchestrator
```

### Target structure

```
src/
  steps/                     # merged agents/ + services/ + scrapers/
  config/
  storage/
  types/
  utils/
  pipeline.ts                # pure function composing the steps
  index.ts                   # parses args, calls runPipeline()
```

The orchestrator class collapses into a ~30-line async function:

```ts
export async function runPipeline(deps: Deps) {
  const targets = await loadSearchTargets(deps);
  const raw     = await scrapeBuiltIn(targets, deps);
  const jobs    = normalizeJobs(raw);
  const matches = filterJobs(jobs, deps.criteria);
  const scored  = scoreJobs(matches, deps.criteria);
  const diff    = await diffJobs(scored, deps.snapshotStore);
  await writeReport(diff, deps);
  await deps.snapshotStore.save(scored);
}
```

## Refactor roadmap

Work in this order. Each item is one focused commit (or a small series). When asked to "refactor" without specifics, find the next un-done item below and propose a plan before touching files.

1. **Add characterization tests** for `normalizeJob` and `scoreJob` against a saved Built In HTML fixture. Goal: capture current behavior so later refactors are verifiable, not guessed.
2. **Validate / drop Playwright.** Spike `fetch` + `cheerio` against actual Built In search and detail pages. Built In is server-rendered Next.js with JSON-LD `JobPosting` schema in each detail page's `<head>` — likely sufficient. If the spike works: swap scraper internals (keep the public output shape stable), remove `@playwright/test`.
3. **Collapse `agents/` into `services/`, rename to `steps/`.** Extract cross-cutting concerns (logging, timing, error handling) into a single `withLogging(name, fn)` decorator. Delete the agents directory.
4. **Replace `JobSearchOrchestrator` with `runPipeline(deps)`** in `pipeline.ts`. Inject deps — no globals, no `new` for stateless concerns. `index.ts` becomes the composition root.
5. **Tidy + harden:** consistent file naming (singular vs. plural, pick one and apply), revisit `types/`, add tests for `snapshotStore` since it's the only stateful piece.

## Conventions

### Functions over classes

The pipeline is a series of pure functions. Use classes only when there is genuine state and identity (e.g., `SnapshotStore`). Don't introduce classes for things that can be modules of functions.

### Dependency injection by argument

Pass `logger`, `snapshotStore`, `clock`, config, etc. as parameters. Never import a singleton logger inside a step — it forces tests to mock the filesystem and clock. The composition root is `pipeline.ts`.

### Step signature

Every file in `steps/` exports a function shaped like:

```ts
export async function stepName(
  input: InputType,
  deps: { logger: Logger; /* ...other deps */ }
): Promise<OutputType> { ... }
```

Synchronous steps drop `async`. Pure transforms (`normalize`, `filter`, `score`) don't need `deps` at all.

### Errors

Throw `Error` subclasses with descriptive messages. Don't swallow errors inside steps — let them bubble to `index.ts`, which is the only place `process.exitCode = 1` should be set.

### Logging

Use `utils/logger.ts`, never `console.log`. Log at step boundaries with structured context (`{ step: 'scrapeBuiltIn', targetCount: 4 }`), not inside tight loops.

### Types

Domain types live in `types/`. Never use `any`. Prefer `unknown` + a type guard at trust boundaries (parsed JSON, scraped HTML).

### File naming

camelCase for filenames matching their primary export: `scrapeBuiltIn.ts` exports `scrapeBuiltIn`. PascalCase for type-only files: `JobPosting.ts`. Tests are `<name>.test.ts` under `tests/` mirroring `src/`.

## Anti-patterns to avoid

- **New "Agent"-named classes.** `agents/` is being deleted, not extended. Calling deterministic pipeline steps "agents" was a mis-naming and is being undone.
- **Reaching for an LLM/SDK for any step.** This is a deterministic pipeline; scoring is rule-based by design. If LLM-based scoring is desired later, that's a separate, scoped change — not a casual addition.
- **New top-level dependencies without justification.** The dep list is intentionally small. If a new dep saves fewer than ~50 lines of code, write the lines.
- **Filesystem access outside the storage / report seams.** Reads/writes to `data/` go through `storage/snapshotStore.ts` and `steps/writeReport.ts`. Nowhere else.
- **Implicit globals.** `process.env` is read only at startup (in `index.ts` or `config/`), never deep in steps.

## Don't touch without an explicit ask

- `data/snapshots/*.json` — historical state; deleting changes diff output.
- `data/reports/*.md` — generated outputs the user may have referenced or shared.
- `.env` — never read or write.
- `package-lock.json` — let npm regenerate it.
- `LICENSE`, `README.md` — coordinate before edits.

## Key invariants

- **Determinism.** Same search results + same prior snapshot must produce the same report and same new snapshot. Refactors that introduce ordering nondeterminism, time-dependent IDs, or floating-point dependent scoring are regressions.
- **`snapshotStore` is the only persistence layer.** Steps don't read or write to disk on their own.
- **Scrape and normalize are separate steps.** `scrapeBuiltIn` returns raw shape; `normalizeJobs` produces canonical `JobPosting`. Don't merge them — the seam is what makes swapping scrapers tractable (Playwright → fetch+cheerio today, Built In → another source later).

## How to work with this codebase

When making changes:

1. Read the relevant step(s) and the type definitions in `types/` first.
2. If unsure where a change belongs, the pipeline diagram is the ground truth — find the step whose name matches the responsibility.
3. Propose changes before making them when the work crosses more than one file or touches a step's public signature.
4. Run `npm run typecheck && npm run test` before declaring work complete.
5. Prefer small, reviewable diffs over sweeping rewrites — even when the target architecture is clear.
