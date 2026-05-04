# Role Play Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the vendor and organizer experiences so they operate as distinct products with different page priorities, state semantics, and rule-driven guidance around the marketplace recruitment closing loop.

**Architecture:** Introduce a shared role-play configuration layer for labels, guidance, and state metadata, then refactor vendor-facing pages around opportunity + progress workflows and organizer-facing pages around recruiting + risk-control workflows. Keep the existing auth/session model and domain entities intact while upgrading page composition, rule prompts, and state presentation through focused page and service-level changes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Prisma-backed services, Better Auth session model

---

## File Map

**Create**
- `apps/web/src/lib/role-play.ts` — shared role labels, state labels, role guidance, page-level helper text
- `apps/web/src/lib/__tests__/role-play.test.ts` — contract tests for shared role-play metadata
- `docs/superpowers/specs/2026-05-03-role-play-design.md` — already written, reference only

**Modify**
- `apps/web/src/components/layout/app-shell.tsx` — make top-level nav semantics reflect distinct vendor vs organizer goals
- `apps/web/src/app/(vendor)/markets/page.tsx` — vendor home/listing page emphasizes opportunities and decision fields
- `apps/web/src/app/(vendor)/markets/[marketId]/page.tsx` — market detail page emphasizes “should I apply” signals
- `apps/web/src/app/(vendor)/markets/[marketId]/apply/page.tsx` — application page emphasizes reusable information and risk prompts
- `apps/web/src/app/(vendor)/applications/page.tsx` — vendor applications page becomes task/status-driven
- `apps/web/src/app/(organizer)/organizer/markets/page.tsx` — organizer home/control page emphasizes recruiting progress and bottlenecks
- `apps/web/src/app/(organizer)/organizer/applications/page.tsx` — organizer application pool emphasizes prioritization and structured actions
- `apps/web/src/app/(organizer)/organizer/dashboard/[marketId]/page.tsx` — organizer dashboard emphasizes confirmation/risk signals
- `apps/web/src/server/applications/service.ts` or the current application service module used by vendor/organizer pages — add presentational grouping metadata if needed without changing persisted schema
- `apps/web/src/server/markets/service.ts` or the current market listing/detail service module — expose vendor decision fields and organizer recruiting summary fields if needed
- `apps/web/src/app/__tests__/vendor-market-pages.test.tsx`
- `apps/web/src/app/__tests__/vendor-apply-page.test.tsx`
- `apps/web/src/app/__tests__/vendor-applications-page.test.tsx`
- `apps/web/src/app/__tests__/organizer-markets-page.test.tsx`
- `apps/web/src/app/__tests__/organizer-applications-page.test.tsx`
- `apps/web/src/app/__tests__/organizer-dashboard-page.test.tsx`
- `apps/web/src/components/layout/__tests__/app-shell.test.tsx`

---

### Task 1: Create Shared Role-Play Metadata

**Files:**
- Create: `apps/web/src/lib/role-play.ts`
- Test: `apps/web/src/lib/__tests__/role-play.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import {
  ORGANIZER_DASHBOARD_PRIORITIES,
  ROLE_GUIDANCE,
  ROLE_LABELS,
  VENDOR_APPLICATION_TASK_GROUPS,
} from "../role-play";

describe("role-play metadata", () => {
  it("defines readable labels and guidance for vendor and organizer roles", () => {
    expect(ROLE_LABELS.vendor).toBe("摊主");
    expect(ROLE_LABELS.organizer).toBe("主办方");
    expect(ROLE_GUIDANCE.organizer).toContain("发布市集");
  });

  it("defines vendor task groups and organizer priorities", () => {
    expect(VENDOR_APPLICATION_TASK_GROUPS[0].id).toBe("pending-action");
    expect(ORGANIZER_DASHBOARD_PRIORITIES).toContain("待审核申请");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/lib/__tests__/role-play.test.ts`
Expected: FAIL with `Cannot find module '../role-play'` or missing export errors

- [ ] **Step 3: Write minimal implementation**

```ts
export const ROLE_LABELS = {
  vendor: "摊主",
  organizer: "主办方",
  admin: "平台管理员",
} as const;

export const ROLE_GUIDANCE = {
  vendor: "可浏览市集、提交报名并跟进自己的入驻进度。",
  organizer: "可发布市集、管理摊位与处理报名申请。",
  admin: "可管理平台组织者、巡检全站数据并处理高权限事务。",
} as const;

export const VENDOR_APPLICATION_TASK_GROUPS = [
  { id: "pending-action", label: "优先处理" },
  { id: "in-progress", label: "处理中" },
  { id: "done", label: "已完成" },
] as const;

export const ORGANIZER_DASHBOARD_PRIORITIES = [
  "待审核申请",
  "待确认摊主",
  "空位风险",
  "补件超时",
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/lib/__tests__/role-play.test.ts`
Expected: PASS with `1` test file green

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/role-play.ts apps/web/src/lib/__tests__/role-play.test.ts
git commit -m "feat: add shared role play metadata"
```

---

### Task 2: Rework Vendor Experience Around Opportunities And Progress

**Files:**
- Modify: `apps/web/src/app/(vendor)/markets/page.tsx`
- Modify: `apps/web/src/app/(vendor)/markets/[marketId]/page.tsx`
- Modify: `apps/web/src/app/(vendor)/markets/[marketId]/apply/page.tsx`
- Modify: `apps/web/src/app/(vendor)/applications/page.tsx`
- Modify: `apps/web/src/app/__tests__/vendor-market-pages.test.tsx`
- Modify: `apps/web/src/app/__tests__/vendor-apply-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/vendor-applications-page.test.tsx`
- Reference: `apps/web/src/lib/role-play.ts`

- [ ] **Step 1: Write the failing tests for vendor opportunity-first copy**

```tsx
it("renders vendor market cards with decision-first fields", async () => {
  render(await MarketsPage({ searchParams: Promise.resolve({}) }));

  expect(screen.getByText("适合我的招募")).toBeInTheDocument();
  expect(screen.getByText(/审核周期/)).toBeInTheDocument();
  expect(screen.getByText(/主办方信誉/)).toBeInTheDocument();
});

it("renders vendor applications as task-first groups", async () => {
  render(await ApplicationsPage());

  expect(screen.getByRole("heading", { name: "待处理事项" })).toBeInTheDocument();
  expect(screen.getByText("待补件")).toBeInTheDocument();
  expect(screen.getByText("待确认")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- src/app/__tests__/vendor-market-pages.test.tsx src/app/__tests__/vendor-apply-page.test.tsx src/app/__tests__/vendor-applications-page.test.tsx`
Expected: FAIL because the new headings and decision fields are not rendered yet

- [ ] **Step 3: Write minimal vendor-facing implementation**

```tsx
<section aria-labelledby="vendor-opportunity-title">
  <h2 id="vendor-opportunity-title">适合我的招募</h2>
  <p>先看时间、品类、费用、审核周期和主办方信誉，再决定是否报名。</p>
</section>
```

```tsx
<aside aria-label="报名风险提示">
  <p>报名截止前可提交，补件和确认逾期将影响本次机会。</p>
  <p>优先完善通用资料，可减少重复填写并提升审核效率。</p>
</aside>
```

```tsx
<section aria-labelledby="vendor-task-title">
  <h2 id="vendor-task-title">待处理事项</h2>
  <ul>
    <li>待补件</li>
    <li>待确认</li>
    <li>审核中</li>
  </ul>
</section>
```

- [ ] **Step 4: Run tests to verify vendor pages pass**

Run: `pnpm --filter web test -- src/app/__tests__/vendor-market-pages.test.tsx src/app/__tests__/vendor-apply-page.test.tsx src/app/__tests__/vendor-applications-page.test.tsx`
Expected: PASS with all three files green

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/app/\(vendor\)/markets/page.tsx \
  apps/web/src/app/\(vendor\)/markets/[marketId]/page.tsx \
  apps/web/src/app/\(vendor\)/markets/[marketId]/apply/page.tsx \
  apps/web/src/app/\(vendor\)/applications/page.tsx \
  apps/web/src/app/__tests__/vendor-market-pages.test.tsx \
  apps/web/src/app/__tests__/vendor-apply-page.test.tsx \
  apps/web/src/app/__tests__/vendor-applications-page.test.tsx
git commit -m "feat: redesign vendor role flow"
```

---

### Task 3: Rework Organizer Experience Around Recruiting Control

**Files:**
- Modify: `apps/web/src/app/(organizer)/organizer/markets/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/applications/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/dashboard/[marketId]/page.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-markets-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-applications-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-dashboard-page.test.tsx`
- Reference: `apps/web/src/lib/role-play.ts`

- [ ] **Step 1: Write the failing tests for organizer control-tower copy**

```tsx
it("renders organizer markets as a recruiting control surface", async () => {
  render(await OrganizerMarketsPage());

  expect(screen.getByRole("heading", { name: "招募进度总览" })).toBeInTheDocument();
  expect(screen.getByText("待审核申请")).toBeInTheDocument();
  expect(screen.getByText("空位风险")).toBeInTheDocument();
});

it("renders organizer applications with structured actions", async () => {
  render(await OrganizerApplicationsPage());

  expect(screen.getByText("优先处理申请")).toBeInTheDocument();
  expect(screen.getByText("候补")).toBeInTheDocument();
  expect(screen.getByText("补件")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- src/app/__tests__/organizer-markets-page.test.tsx src/app/__tests__/organizer-applications-page.test.tsx src/app/__tests__/organizer-dashboard-page.test.tsx`
Expected: FAIL because organizer pages do not yet expose the new control-tower framing

- [ ] **Step 3: Write minimal organizer-facing implementation**

```tsx
<section aria-labelledby="organizer-overview-title">
  <h2 id="organizer-overview-title">招募进度总览</h2>
  <ul>
    <li>待审核申请</li>
    <li>待确认摊主</li>
    <li>空位风险</li>
  </ul>
</section>
```

```tsx
<section aria-label="优先处理申请">
  <p>优先处理资料完整、履约稳定且匹配当前市集主题的申请。</p>
  <button type="button">候补</button>
  <button type="button">补件</button>
</section>
```

```tsx
<aside aria-label="成场风险提醒">
  <p>确认率偏低或空位较多时，优先推进候补补位和摊主确认。</p>
</aside>
```

- [ ] **Step 4: Run tests to verify organizer pages pass**

Run: `pnpm --filter web test -- src/app/__tests__/organizer-markets-page.test.tsx src/app/__tests__/organizer-applications-page.test.tsx src/app/__tests__/organizer-dashboard-page.test.tsx`
Expected: PASS with all organizer page tests green

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/app/\(organizer\)/organizer/markets/page.tsx \
  apps/web/src/app/\(organizer\)/organizer/applications/page.tsx \
  apps/web/src/app/\(organizer\)/organizer/dashboard/[marketId]/page.tsx \
  apps/web/src/app/__tests__/organizer-markets-page.test.tsx \
  apps/web/src/app/__tests__/organizer-applications-page.test.tsx \
  apps/web/src/app/__tests__/organizer-dashboard-page.test.tsx
git commit -m "feat: redesign organizer control surfaces"
```

---

### Task 4: Productize Shared Navigation, State Semantics, And Rule Guidance

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Modify: `apps/web/src/components/layout/__tests__/app-shell.test.tsx`
- Modify: `apps/web/src/server/applications/service.ts` or the current application service module
- Modify: `apps/web/src/server/markets/service.ts` or the current market listing/detail service module
- Reference: `apps/web/src/lib/role-play.ts`

- [ ] **Step 1: Write the failing tests for shared role semantics**

```tsx
it("renders vendor and organizer entry labels with distinct product semantics", async () => {
  render(await AppShell({ children: <div>content</div> }));

  expect(screen.getByText("摊主端")).toBeInTheDocument();
  expect(screen.getByText("主办方端")).toBeInTheDocument();
  expect(screen.getByText("我的报名")).toBeInTheDocument();
});
```

```ts
it("returns application group metadata for vendor task ordering", async () => {
  const applications = await listVendorApplications("vendor_1");
  expect(applications[0]).toHaveProperty("taskGroup");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- src/components/layout/__tests__/app-shell.test.tsx src/server/applications/__tests__/application-service.test.ts`
Expected: FAIL because the new task-group field and refined nav semantics are not available yet

- [ ] **Step 3: Write minimal shared implementation**

```ts
return applications.map((application) => ({
  ...application,
  taskGroup:
    application.status === "under_review" ? "in-progress" :
    application.status === "submitted" ? "pending-action" :
    "done",
}));
```

```tsx
<nav aria-label="角色导航">
  <Link href="/markets">摊主端</Link>
  <Link href="/organizer/markets">主办方端</Link>
</nav>
```

```ts
export function getVendorStatusHint(status: string) {
  if (status === "submitted") return "等待主办方处理";
  if (status === "under_review") return "审核中";
  return "查看最新结果";
}
```

- [ ] **Step 4: Run tests to verify shared semantics pass**

Run: `pnpm --filter web test -- src/components/layout/__tests__/app-shell.test.tsx src/server/applications/__tests__/application-service.test.ts`
Expected: PASS with updated shared semantics

- [ ] **Step 5: Run focused regression and build**

Run: `pnpm --filter web test -- src/app/__tests__/vendor-market-pages.test.tsx src/app/__tests__/organizer-markets-page.test.tsx src/components/layout/__tests__/app-shell.test.tsx`
Expected: PASS

Run: `pnpm --filter web build`
Expected: PASS with successful production build

- [ ] **Step 6: Commit**

```bash
git add \
  apps/web/src/components/layout/app-shell.tsx \
  apps/web/src/components/layout/__tests__/app-shell.test.tsx \
  apps/web/src/server/applications/service.ts \
  apps/web/src/server/markets/service.ts
git commit -m "feat: add shared role play semantics"
```

---

### Task 5: Finalize Docs And Acceptance Notes

**Files:**
- Modify: `docs/ACCEPTANCE_认证升级.md`
- Modify: `docs/TODO_认证升级.md`
- Modify: `docs/ALIGNMENT_角色玩法升级.md`
- Modify: `docs/DESIGN_角色玩法升级.md`
- Modify: `docs/TASK_角色玩法升级.md`

- [ ] **Step 1: Write the failing doc expectation as a checklist**

```md
- 角色玩法升级已落地到摊主首页
- 角色玩法升级已落地到主办方首页
- 状态语义和风险提示已同步
```

- [ ] **Step 2: Review implementation coverage against the role-play spec**

Run: `grep -n "角色玩法升级" docs/ACCEPTANCE_认证升级.md docs/TODO_认证升级.md`
Expected: missing entries or outdated wording before the edit

- [ ] **Step 3: Update docs with actual implementation outcomes**

```md
- 已完成摊主端“机会 + 进度”式首页改造
- 已完成主办方端“招商控制台”式首页改造
- 已完成角色差异化状态文案与规则提示
```

- [ ] **Step 4: Re-run doc sanity checks**

Run: `grep -R -n "TBD\|TODO\|待定\|占位" docs/ALIGNMENT_角色玩法升级.md docs/DESIGN_角色玩法升级.md docs/TASK_角色玩法升级.md docs/ACCEPTANCE_认证升级.md docs/TODO_认证升级.md`
Expected: only intentional TODO doc content, no placeholders in design docs

- [ ] **Step 5: Commit**

```bash
git add \
  docs/ACCEPTANCE_认证升级.md \
  docs/TODO_认证升级.md \
  docs/ALIGNMENT_角色玩法升级.md \
  docs/DESIGN_角色玩法升级.md \
  docs/TASK_角色玩法升级.md
git commit -m "docs: finalize role play upgrade handoff"
```

---

## Self-Review

- **Spec coverage:** The plan covers the role-play spec’s four required implementation areas: vendor page restructuring, organizer page restructuring, shared rule/state semantics, and follow-up documentation.
- **Placeholder scan:** No `TBD`, `TODO`, “implement later”, or “similar to above” placeholders are present inside executable steps.
- **Type consistency:** Shared metadata lives in `role-play.ts`; downstream page/service tasks reference the same labels and task-group semantics rather than inventing parallel names.

