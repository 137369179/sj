# Full Site Bug Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore whole-site engineering stability by scanning the web app for failing tests, type/build issues, and high-priority regressions, then fix them in verified batches.

**Architecture:** Use a diagnostics-first workflow instead of ad hoc page edits. Start from repository-wide signals (`test`, targeted reruns, `build`, `lint`), group failures by subsystem, then repair the smallest bounded unit with TDD before moving to the next failure cluster.

**Tech Stack:** `pnpm`, `turbo`, `Next.js`, `React`, `TypeScript`, `Vitest`, `Prisma`

---

### Task 1: Establish Baseline Failures

**Files:**
- Modify: `docs/superpowers/plans/2026-05-03-full-site-bug-sweep.md`
- Inspect: `package.json`
- Inspect: `apps/web/package.json`

- [ ] **Step 1: Run the web test suite to collect the first failure set**

Run:

```bash
pnpm --filter web test
```

Expected:
- A deterministic set of failing tests or a successful pass.
- The first failing file path and assertion output are visible in logs.

- [ ] **Step 2: Run the app build after recording test failures**

Run:

```bash
pnpm --filter web build
```

Expected:
- Either a successful production build or actionable TypeScript / Next.js build errors.

- [ ] **Step 3: Run lint only if test/build output is not already blocking**

Run:

```bash
pnpm --filter web lint
```

Expected:
- Either a clean lint pass or a bounded set of static issues to repair after blocking failures.

- [ ] **Step 4: Record the failure clusters before touching code**

Create a short grouped list in working notes with these buckets:

```text
P0: build/type failures
P1: failing server/API tests
P1: failing route/page tests
P2: lint/style issues
```

- [ ] **Step 5: Commit only if a notes artifact is added**

```bash
git add docs/superpowers/plans/2026-05-03-full-site-bug-sweep.md
git commit -m "docs: add full-site bug sweep plan"
```

### Task 2: Stabilize Known Vendor Applications Test Fixtures

**Files:**
- Modify: `apps/web/src/app/__tests__/vendor-applications-page.test.tsx`
- Inspect: `apps/web/src/app/(vendor)/applications/page.tsx`
- Inspect: `apps/web/src/server/applications/service.ts`
- Test: `apps/web/src/app/__tests__/vendor-applications-page.test.tsx`

- [ ] **Step 1: Write or preserve the failing expectation through the existing test data**

Use the existing mocked applications array as the failure trigger. Ensure fixture objects consistently expose the nullable fields used by the vendor applications page:

```ts
assignedStallId: null,
assignedStallCode: null,
assignedStallName: null,
assignedStallPrice: null,
orderId: null,
orderAmount: null,
orderStatus: null,
orderPaidAt: null
```

- [ ] **Step 2: Run the focused vendor applications page test to capture the actual failure**

Run:

```bash
pnpm --filter web test -- src/app/__tests__/vendor-applications-page.test.tsx
```

Expected:
- FAIL if the fixture shape is inconsistent or duplicated.
- PASS if the failure moved elsewhere and this file is already stable.

- [ ] **Step 3: Apply the minimal fixture normalization**

Use a single consistent object shape for each mocked vendor application. The approved null block for non-assigned applications is:

```ts
assignedStallId: null,
assignedStallCode: null,
assignedStallName: null,
assignedStallPrice: null,
orderId: null,
orderAmount: null,
orderStatus: null,
orderPaidAt: null
```

For stall-assigned records, keep explicit stall fields and add missing order fields only when the page contract requires them:

```ts
assignedStallId: "stall_3",
assignedStallCode: "B-03",
assignedStallName: "内场 3 号位"
```

- [ ] **Step 4: Re-run the focused test until it passes**

Run:

```bash
pnpm --filter web test -- src/app/__tests__/vendor-applications-page.test.tsx
```

Expected:
- PASS for `vendor-applications-page.test.tsx`

- [ ] **Step 5: Commit the isolated test-fixture repair**

```bash
git add apps/web/src/app/__tests__/vendor-applications-page.test.tsx
git commit -m "test: normalize vendor application fixtures"
```

### Task 3: Fix the Next Highest-Priority Failure Cluster

**Files:**
- Modify: exact failing files from Task 1 output
- Test: exact failing test files from Task 1 output

- [ ] **Step 1: Select one failure cluster only**

Pick exactly one of:

```text
build/type failure
server/API test failure
page/component test failure
```

Selection rule:
- Prefer `build/type failure` over all others.
- If there is no build/type failure, prefer the test cluster with the most failures from one subsystem.

- [ ] **Step 2: Add or tighten the failing test before implementation if the failure is behavioral**

Template:

```ts
it("handles the reported regression", async () => {
  // arrange
  // act
  // assert
});
```

If the failure already exists as a red test, do not add a duplicate; use the existing failing test as the red phase.

- [ ] **Step 3: Implement the smallest repair in production code**

Repair only the file directly responsible for the failure. Typical targets in this repository are:

```text
apps/web/src/app/**/page.tsx
apps/web/src/app/api/**/route.ts
apps/web/src/server/**/service.ts
apps/web/src/lib/**/*.ts
```

- [ ] **Step 4: Run the smallest proving command first**

Examples:

```bash
pnpm --filter web test -- src/app/api/markets/route.test.ts
pnpm --filter web test -- src/server/applications/__tests__/application-service.test.ts
pnpm --filter web test -- src/app/__tests__/organizer-dashboard-page.test.tsx
```

Expected:
- The targeted failure passes before any broader rerun.

- [ ] **Step 5: Run the containing cluster again**

Examples:

```bash
pnpm --filter web test -- src/app/__tests__
pnpm --filter web test -- src/server
pnpm --filter web build
```

Expected:
- No regression in the repaired cluster.

### Task 4: Final Verification and Handoff

**Files:**
- Modify: any touched source or test files from Tasks 2-3
- Inspect: `docs/ACCEPTANCE_*.md` if an acceptance note is added

- [ ] **Step 1: Run the broadest safe verification after repairs**

Run:

```bash
pnpm --filter web test
pnpm --filter web build
pnpm --filter web lint
```

Expected:
- All repaired areas remain green.
- Any remaining failures are explicitly listed.

- [ ] **Step 2: Check diagnostics for recently edited files**

Use editor diagnostics on each touched file and resolve introduced errors before handoff.

- [ ] **Step 3: Summarize residual risk**

Use this structure:

```text
Fixed:
- ...

Still failing:
- ...

Not yet verified manually:
- ...
```

- [ ] **Step 4: Commit each logical repair batch separately**

```bash
git add <relevant-files>
git commit -m "fix: repair <subsystem>"
```

- [ ] **Step 5: Hand off with exact verification commands**

Provide the commands that were actually run and their result status:

```bash
pnpm --filter web test
pnpm --filter web build
pnpm --filter web lint
```
