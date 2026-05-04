# 类型检查恢复零错误最小闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清理当前真实存在的 TypeScript 类型债，让 `pnpm --filter web exec tsc --noEmit` 恢复为零错误，同时保持全量测试通过。

**Architecture:** 把当前类型报错拆成“测试夹具对齐”“服务层显式类型补齐”“旧断言写法兼容”三类处理，优先修夹具和显式类型，不放宽现有业务接口定义。`tsc --noEmit` 作为主红绿信号，`vitest run` 作为行为回归验证。

**Tech Stack:** TypeScript、Vitest、Next.js、Prisma

---

## 文件分解

- Modify: `apps/web/src/app/__tests__/organizer-applications-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-stalls-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/vendor-applications-page.test.tsx`
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.test.ts`
- Modify: `apps/web/src/server/applications/service.ts`
- Modify: `apps/web/src/server/stalls/service.ts`
- Modify: `apps/web/src/server/dashboard/service.ts`
- Modify: `apps/web/src/server/markets/service.ts`
- Modify: `apps/web/src/server/applications/__tests__/application-service.test.ts`
- Modify: `apps/web/src/server/stalls/__tests__/stall-service.test.ts`
- Modify: `apps/web/src/server/dashboard/__tests__/dashboard-service.test.ts`
- Create: `docs/ACCEPTANCE_typecheck-recovery-minimum-closure.md`
- Create: `docs/TODO_typecheck-recovery-minimum-closure.md`

### Task 1: 用 tsc 锁定并修复测试夹具类型

**Files:**
- Modify: `apps/web/src/app/__tests__/organizer-applications-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-stalls-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/vendor-applications-page.test.tsx`
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.test.ts`

- [x] **Step 1: 给审核记录夹具补 `applicationId`**
- [x] **Step 2: 给 application list item 夹具补 `note`**
- [x] **Step 3: 给 stalls 相关 application fixture 补 `attachments` / `reviews` / `reviewedAt`**
- [x] **Step 4: 给 dashboard route metrics fixture 补 `totalStalls` / `activeStalls` / `occupiedStalls` / `stallOccupancyRate`**
- [x] **Step 5: 运行 `pnpm --filter web exec tsc --noEmit`，确认错误减少且落点转移到服务层**

### Task 2: 补齐服务层与 service tests 的显式类型

**Files:**
- Modify: `apps/web/src/server/applications/service.ts`
- Modify: `apps/web/src/server/stalls/service.ts`
- Modify: `apps/web/src/server/dashboard/service.ts`
- Modify: `apps/web/src/server/markets/service.ts`
- Modify: `apps/web/src/server/applications/__tests__/application-service.test.ts`
- Modify: `apps/web/src/server/stalls/__tests__/stall-service.test.ts`
- Modify: `apps/web/src/server/dashboard/__tests__/dashboard-service.test.ts`

- [x] **Step 1: 给 `map()` / 解构回调参数补显式类型**
- [x] **Step 2: 给交互式 transaction callback 补参数类型**
- [x] **Step 3: 去掉和当前 Vitest/TS 不兼容的多余泛型断言**
- [x] **Step 4: 再跑 `pnpm --filter web exec tsc --noEmit`，确认通过**

### Task 3: 全量回归与专项收尾

**Files:**
- Create: `docs/ACCEPTANCE_typecheck-recovery-minimum-closure.md`
- Create: `docs/TODO_typecheck-recovery-minimum-closure.md`

- [x] **Step 1: 跑全量测试**
Run: `pnpm --filter web exec vitest run`
Expected: PASS

- [x] **Step 2: 跑类型检查**
Run: `pnpm --filter web exec tsc --noEmit`
Expected: PASS

- [x] **Step 3: 补专项验收与 TODO 文档**

## 自检


- Spec coverage
  - 测试夹具类型修正：Task 1 覆盖
  - 服务层显式类型修正：Task 2 覆盖
  - 回归与文档：Task 3 覆盖
- Placeholder scan
  - 无 `TODO` / `TBD` / “类似 Task N” 占位
- Type consistency
  - `ApplicationReviewAuditRecord`、`OrganizerApplicationListItem`、`VendorApplicationListItem` 与 metrics 字段名保持一致
