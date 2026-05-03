# 主办方身份链路收尾与 MVP Backlog 同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将看板 API 与摊位分配 API 统一切到 session userId 身份来源，并同步修正已陈旧的 MVP backlog/acceptance 文档。

**Architecture:** API 入口层全部收口到 `getSessionUser()`，由 route 负责权限校验与 userId 注入，service 层继续保持显式 `organizerId` 输入边界不变。文档层只同步当前已完成状态，不引入新的产品范围。

**Tech Stack:** TypeScript、Next.js App Router、Vitest

---

## 文件分解

- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.ts`
  - 看板 API 改为使用 session userId，不再依赖 query `organizerId`
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.test.ts`
  - 先补 dashboard API 身份来源失败测试
- Modify: `apps/web/src/app/api/stalls/[stallId]/assign/route.ts`
  - 摊位分配 API 改为使用 session userId 覆写 body 中的 `organizerId`
- Modify: `apps/web/src/app/api/stalls/[stallId]/assign/route.test.ts`
  - 先补 assign API 身份接管失败测试
- Modify: `docs/TODO_市集招募平台_MVP.md`
  - 去掉已完成或已被代码追平的陈旧待办
- Modify: `docs/ACCEPTANCE_市集招募平台_MVP.md`
  - 修正身份来源和 MVP 当前完成度描述
- Create: `docs/ACCEPTANCE_organizer-session-identity-tail-closure.md`
- Create: `docs/TODO_organizer-session-identity-tail-closure.md`

### Task 1: 补 API 身份收口失败测试

**Files:**
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.test.ts`
- Modify: `apps/web/src/app/api/stalls/[stallId]/assign/route.test.ts`

- [ ] **Step 1: 给 dashboard API 补 session userId 红灯**

```ts
it("uses the session userId for dashboard queries without requiring organizerId in search params", async () => {
  vi.mocked(getSessionUser).mockResolvedValue({
    userId: "org_session_1",
    role: "organizer"
  });
  vi.mocked(getMarketDashboardSummary).mockResolvedValue({
    market: {
      id: "market_1",
      title: "春日咖啡市集",
      city: "杭州"
    },
    metrics: {
      totalApplications: 5,
      pendingReviewCount: 2,
      approvedCount: 1,
      rejectedCount: 1,
      assignedCount: 1,
      approvalRate: 0.4
    }
  });

  const response = await GET(new Request("http://localhost/api/dashboard/markets/market_1"), {
    params: Promise.resolve({ marketId: "market_1" })
  });

  expect(getMarketDashboardSummary).toHaveBeenCalledWith({
    organizerId: "org_session_1",
    marketId: "market_1"
  });
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: 给摊位分配 API 补 organizerId 覆写红灯**

```ts
it("uses the session userId instead of organizerId from request body", async () => {
  vi.mocked(getSessionUser).mockResolvedValue({
    userId: "org_session_1",
    role: "organizer"
  });
  vi.mocked(buildAssignStallPayload).mockReturnValue({
    organizerId: "org_body_1",
    applicationId: "app_1"
  });
  vi.mocked(assignStall).mockResolvedValue({
    stall: {
      id: "stall_1",
      assignedApplicationId: "app_1"
    },
    application: {
      id: "app_1",
      status: "stall_assigned"
    },
    notification: {
      id: "notice_1",
      userId: "vendor_1",
      title: "摊位分配已确认",
      content: "你在春日咖啡市集的申请已完成摊位分配，摊位为主通道 1 号位（A-01）。"
    }
  });

  const request = new Request("http://localhost/api/stalls/stall_1/assign", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      organizerId: "org_body_1",
      applicationId: "app_1"
    })
  });

  await POST(request, {
    params: Promise.resolve({ stallId: "stall_1" })
  });

  expect(assignStall).toHaveBeenCalledWith({
    organizerId: "org_session_1",
    stallId: "stall_1",
    applicationId: "app_1"
  });
});
```

- [ ] **Step 3: 运行定向测试，确认失败**

Run:

```bash
pnpm --filter web exec vitest run \
  src/app/api/dashboard/markets/[marketId]/route.test.ts \
  src/app/api/stalls/[stallId]/assign/route.test.ts
```

Expected: FAIL，提示 dashboard API 仍依赖 query `organizerId`，assign API 仍沿用 body 中的 `organizerId`。

### Task 2: 实现 API 身份来源统一

**Files:**
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.ts`
- Modify: `apps/web/src/app/api/stalls/[stallId]/assign/route.ts`

- [ ] **Step 1: dashboard API 改为读取 session userId**

```ts
import { getSessionUser } from "../../../../../lib/auth";
```

```ts
const sessionUser = await getSessionUser();

if (!sessionUser || (sessionUser.role !== "organizer" && sessionUser.role !== "admin")) {
  return NextResponse.json({ message: "forbidden" }, { status: 403 });
}
```

```ts
const summary = await getMarketDashboardSummary({
  organizerId: sessionUser.userId,
  marketId
});
```

- [ ] **Step 2: 摊位分配 API 改为用 session userId 覆写 organizerId**

```ts
import { getSessionUser } from "../../../../../lib/auth";
```

```ts
const sessionUser = await getSessionUser();

if (!sessionUser || (sessionUser.role !== "organizer" && sessionUser.role !== "admin")) {
  return NextResponse.json({ message: "forbidden" }, { status: 403 });
}
```

```ts
const result = await assignStall({
  stallId,
  ...payload,
  organizerId: sessionUser.userId
});
```

- [ ] **Step 3: 运行定向测试，确认通过**

Run:

```bash
pnpm --filter web exec vitest run \
  src/app/api/dashboard/markets/[marketId]/route.test.ts \
  src/app/api/stalls/[stallId]/assign/route.test.ts
```

Expected: PASS

### Task 3: 同步 MVP backlog 与验收文档

**Files:**
- Modify: `docs/TODO_市集招募平台_MVP.md`
- Modify: `docs/ACCEPTANCE_市集招募平台_MVP.md`

- [ ] **Step 1: 清理 TODO 文档中的已完成项**

把以下旧待办从 P0/P1 移出或改写为“已完成，进入后续增强阶段”：

```md
- 报名页完整前端闭环
- Prisma 正式迁移
- 身份上下文从 query 参数升级为真实会话
- 报名备注与审核备注拆分
- 审核记录持久化
- 主办方页面体验增强
```

- [ ] **Step 2: 修正 acceptance 文档中的过时差异描述**

将以下旧描述改为当前状态：

```md
- 登录与身份校验仍是 MVP stub
- 主办方和摊主当前通过 `query` 参数模拟身份上下文
```

改写方向：

```md
- 登录与身份校验仍是最小 session stub，不是生产级认证
- 页面与关键 API 已以 session userId 作为身份来源
```

- [ ] **Step 3: 检查文档与当前代码表述一致**

核对：

```md
- 报名页闭环
- migration 已存在
- 审核记录已持久化
- 主办方页面已具备列表/筛选/看板联动
```

### Task 4: 全量回归与文档收尾

**Files:**
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.ts`
- Modify: `apps/web/src/app/api/stalls/[stallId]/assign/route.ts`
- Modify: `docs/TODO_市集招募平台_MVP.md`
- Modify: `docs/ACCEPTANCE_市集招募平台_MVP.md`
- Create: `docs/ACCEPTANCE_organizer-session-identity-tail-closure.md`
- Create: `docs/TODO_organizer-session-identity-tail-closure.md`

- [ ] **Step 1: 跑全量测试**

Run: `pnpm --filter web exec vitest run`

Expected: PASS

- [ ] **Step 2: 跑类型检查**

Run: `pnpm --filter web exec tsc --noEmit`

Expected: PASS

- [ ] **Step 3: 补专项验收与 TODO 文档**

```md
# 主办方身份链路收尾验收记录
```

```md
# 主办方身份链路收尾后续事项
```

## 自检

- Spec coverage
  - dashboard API 身份收口：Task 1 和 Task 2 覆盖
  - stall assign API 身份收口：Task 1 和 Task 2 覆盖
  - MVP 文档同步：Task 3 覆盖
  - 回归与专项收尾：Task 4 覆盖
- Placeholder scan
  - 无 `TODO` / `TBD` / “类似 Task N” 占位
- Type consistency
  - `getSessionUser`、`sessionUser.userId`、`organizerId` 覆写逻辑在计划内保持一致
