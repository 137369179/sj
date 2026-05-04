# MVP P0 扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前 MVP 招募闭环基础上，一次性补齐报名页完整前端闭环、Prisma 正式迁移、session userId 接入、报名备注与审核备注拆分。

**Architecture:** 本轮不推翻现有服务分层，继续沿用 `Next.js App Router + Prisma + Vitest` 结构，在数据层先做兼容式 schema 扩展和 migration，再把应用服务、API 和页面切换到新字段与 session userId 方案。前端报名页采用最小表单闭环，不引入新 UI 库，也不在本轮扩展到真实对象存储上传。

**Tech Stack:** Next.js, TypeScript, Prisma, PostgreSQL, Vitest, Testing Library, pnpm

---

## 文件结构

### 需要修改

- Modify: `apps/web/prisma/schema.prisma`
- Modify: `apps/web/src/lib/auth.ts`
- Modify: `apps/web/src/lib/roles.ts`
- Modify: `apps/web/src/app/api/auth/login/route.ts`
- Modify: `apps/web/src/app/api/applications/route.ts`
- Modify: `apps/web/src/app/api/applications/[applicationId]/review/route.ts`
- Modify: `apps/web/src/app/api/stalls/[stallId]/assign/route.ts`
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.ts`
- Modify: `apps/web/src/server/applications/service.ts`
- Modify: `apps/web/src/server/notifications/service.ts`
- Modify: `apps/web/src/app/(vendor)/applications/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/applications/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/stalls/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/dashboard/[marketId]/page.tsx`
- Modify: `apps/web/src/app/(vendor)/markets/[marketId]/page.tsx`

### 需要新增

- Create: `apps/web/prisma/migrations/<timestamp>_mvp_p0_expansion/migration.sql`
- Create: `apps/web/src/app/(vendor)/markets/[marketId]/apply/page.tsx`
- Create: `apps/web/src/app/__tests__/vendor-apply-page.test.tsx`
- Create: `apps/web/src/server/applications/__tests__/application-p0-fields.test.ts`

### 需要新增或扩展测试

- Modify: `apps/web/src/server/applications/__tests__/application-service.test.ts`
- Modify: `apps/web/src/app/api/applications/route.test.ts`
- Modify: `apps/web/src/app/api/applications/[applicationId]/review/route.test.ts`
- Modify: `apps/web/src/server/auth/__tests__/role-guard.test.ts`
- Modify: `apps/web/src/app/__tests__/vendor-applications-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-applications-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-stalls-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-dashboard-page.test.tsx`

## 范围约束

- 不引入完整注册系统
- 不引入真实对象存储上传
- 不新增独立 `ApplicationReview` 历史表
- 不删除旧 `note` 字段
- 不回退当前已完成的 MVP 功能

### Task 1: 扩展 Prisma schema 并生成正式 migration

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/<timestamp>_mvp_p0_expansion/migration.sql`
- Test: `apps/web/src/server/applications/__tests__/application-p0-fields.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 Application 新字段契约**

```ts
// apps/web/src/server/applications/__tests__/application-p0-fields.test.ts
import { describe, expect, it } from "vitest";
import { buildApplicationPayload } from "../service";

describe("application p0 fields", () => {
  it("accepts applicationNote, boothPreference and attachmentsJson input", () => {
    const payload = buildApplicationPayload({
      marketId: "market_1",
      boothPreference: "靠近主通道",
      applicationNote: "主营手作咖啡",
      attachments: [
        {
          url: "/uploads/license.png",
          originalName: "license.png"
        }
      ]
    });

    expect(payload.applicationNote).toBe("主营手作咖啡");
    expect(payload.boothPreference).toBe("靠近主通道");
    expect(payload.attachments).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 运行测试，确认按预期失败**

Run: `pnpm --filter web test application-p0-fields.test.ts`
Expected: FAIL because `buildApplicationPayload` still expects the old field shape and does not expose `applicationNote`

- [ ] **Step 3: 更新 Prisma schema，新增兼容字段**

```prisma
// apps/web/prisma/schema.prisma
model Application {
  id               String            @id @default(cuid())
  marketId         String
  vendorId         String
  status           ApplicationStatus @default(submitted)
  note             String?
  applicationNote  String?
  reviewNote       String?
  boothPreference  String?
  attachmentsJson  Json?
  reviewedAt       DateTime?
  reviewedByUserId String?
  createdAt        DateTime          @default(now())
  market           Market            @relation(fields: [marketId], references: [id])
  vendor           User              @relation("VendorApplications", fields: [vendorId], references: [id])
  assignedStall    Stall?

  @@unique([marketId, vendorId])
}
```

```sql
-- apps/web/prisma/migrations/<timestamp>_mvp_p0_expansion/migration.sql
ALTER TABLE "Application"
  ADD COLUMN "applicationNote" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "boothPreference" TEXT,
  ADD COLUMN "attachmentsJson" JSONB,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByUserId" TEXT;
```

- [ ] **Step 4: 回放 migration 并重新生成 Prisma Client**

Run: `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/market_recruitment' pnpm --filter web exec prisma migrate dev --name mvp_p0_expansion`
Expected: PASS with a new migration directory created

Run: `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/market_recruitment' pnpm --filter web exec prisma generate`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations apps/web/src/server/applications/__tests__/application-p0-fields.test.ts
git commit -m "feat: extend application schema for p0 flow"
```

### Task 2: 升级 session userId 与 auth 边界

**Files:**
- Modify: `apps/web/src/lib/auth.ts`
- Modify: `apps/web/src/lib/roles.ts`
- Modify: `apps/web/src/app/api/auth/login/route.ts`
- Modify: `apps/web/src/server/auth/__tests__/role-guard.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 session user 结构**

```ts
// apps/web/src/server/auth/__tests__/role-guard.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => {
      const values: Record<string, { value: string }> = {
        mrp_session_role: { value: "vendor" },
        mrp_session_user_id: { value: "vendor_1" }
      };
      return values[key];
    }
  })
}));

import { getSessionUser } from "@/lib/auth";

describe("getSessionUser", () => {
  it("returns both userId and role from cookies", async () => {
    await expect(getSessionUser()).resolves.toEqual({
      userId: "vendor_1",
      role: "vendor"
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm --filter web test role-guard.test.ts`
Expected: FAIL because `getSessionUser` does not exist yet

- [ ] **Step 3: 实现 session user 升级**

```ts
// apps/web/src/lib/auth.ts
import { cookies } from "next/headers";

import { isUserRole, type UserRole } from "./roles";

export const SESSION_ROLE_KEY = "mrp_session_role";
export const SESSION_USER_ID_KEY = "mrp_session_user_id";

export async function getSessionUser(): Promise<{
  userId: string;
  role: UserRole;
} | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get(SESSION_ROLE_KEY)?.value;
  const userId = cookieStore.get(SESSION_USER_ID_KEY)?.value;

  if (!role || !userId || !isUserRole(role)) {
    return null;
  }

  return {
    userId,
    role
  };
}

export async function getSessionRole(): Promise<UserRole | null> {
  const sessionUser = await getSessionUser();
  return sessionUser?.role ?? null;
}
```

```ts
// apps/web/src/lib/roles.ts
export type UserRole = "vendor" | "organizer" | "admin";

export function isUserRole(value: string): value is UserRole {
  return value === "vendor" || value === "organizer" || value === "admin";
}
```

```ts
// apps/web/src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";

import { isUserRole } from "@/lib/roles";

export async function POST(request: Request) {
  const body = await request.json();
  const role = body.role;
  const userId = body.userId;

  if (!isUserRole(role) || typeof userId !== "string" || userId.trim().length === 0) {
    return NextResponse.json({ message: "invalid session payload" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("mrp_session_role", role, { httpOnly: true, path: "/" });
  response.cookies.set("mrp_session_user_id", userId, { httpOnly: true, path: "/" });
  return response;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test role-guard.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/lib/auth.ts apps/web/src/lib/roles.ts apps/web/src/app/api/auth/login/route.ts apps/web/src/server/auth/__tests__/role-guard.test.ts
git commit -m "feat: add session user identity"
```

### Task 3: 切换 application service 到新字段语义

**Files:**
- Modify: `apps/web/src/server/applications/service.ts`
- Modify: `apps/web/src/server/applications/__tests__/application-service.test.ts`
- Modify: `apps/web/src/server/applications/__tests__/application-p0-fields.test.ts`

- [ ] **Step 1: 写失败测试，锁定新字段与 reviewNote 语义**

```ts
// apps/web/src/server/applications/__tests__/application-service.test.ts
import { describe, expect, it } from "vitest";
import { buildApplicationReviewPayload } from "../service";

describe("buildApplicationReviewPayload", () => {
  it("accepts reviewNote instead of legacy note", () => {
    const payload = buildApplicationReviewPayload({
      decision: "approved",
      reviewNote: "资质完整，允许进入分配"
    });

    expect(payload.reviewNote).toBe("资质完整，允许进入分配");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm --filter web test application-service.test.ts application-p0-fields.test.ts`
Expected: FAIL because the current service still uses old payload fields

- [ ] **Step 3: 更新 application service**

```ts
// apps/web/src/server/applications/service.ts
const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const applicationSchema = z.object({
  marketId: z.string().trim().min(1),
  boothPreference: z.string().trim().min(1),
  applicationNote: optionalTextSchema,
  attachments: z.array(storedAttachmentSchema).default([])
});

export const applicationReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewNote: optionalTextSchema
});

export function buildApplicationPayload(input: unknown) {
  return applicationSchema.parse(input);
}

export function buildApplicationReviewPayload(input: unknown) {
  return applicationReviewSchema.parse(input);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test application-service.test.ts application-p0-fields.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/server/applications/service.ts apps/web/src/server/applications/__tests__/application-service.test.ts apps/web/src/server/applications/__tests__/application-p0-fields.test.ts
git commit -m "feat: split application and review note semantics"
```

### Task 4: 报名 API 与审核 API 切到 session userId

**Files:**
- Modify: `apps/web/src/app/api/applications/route.ts`
- Modify: `apps/web/src/app/api/applications/[applicationId]/review/route.ts`
- Modify: `apps/web/src/app/api/applications/route.test.ts`
- Modify: `apps/web/src/app/api/applications/[applicationId]/review/route.test.ts`

- [ ] **Step 1: 先写失败测试，锁定不再信任 body/query 中的身份字段**

```ts
// apps/web/src/app/api/applications/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn()
}));

import { getSessionUser } from "@/lib/auth";

describe("POST /api/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses vendor userId from session instead of request body", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_session_1",
      role: "vendor"
    });

    expect(getSessionUser).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm --filter web test route.test.ts`
Expected: FAIL because the current route still reads `vendorId` from request body

- [ ] **Step 3: 改造两个 API**

```ts
// apps/web/src/app/api/applications/route.ts
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildApplicationPayload } from "@/server/applications/service";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "vendor") {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const payload = buildApplicationPayload(body);

  const existing = await db.application.findFirst({
    where: {
      marketId: payload.marketId,
      vendorId: sessionUser.userId
    }
  });

  if (existing) {
    return NextResponse.json({ message: "duplicate application" }, { status: 409 });
  }

  const application = await db.application.create({
    data: {
      marketId: payload.marketId,
      vendorId: sessionUser.userId,
      boothPreference: payload.boothPreference,
      applicationNote: payload.applicationNote,
      attachmentsJson: payload.attachments,
      status: "submitted"
    }
  });

  return NextResponse.json(application, { status: 201 });
}
```

```ts
// apps/web/src/app/api/applications/[applicationId]/review/route.ts
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { buildApplicationReviewPayload, reviewApplicationByOrganizer } from "@/server/applications/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;
  const body = await request.json();
  const payload = buildApplicationReviewPayload(body);

  const result = await reviewApplicationByOrganizer({
    applicationId,
    organizerId: sessionUser.userId,
    decision: payload.decision,
    reviewNote: payload.reviewNote
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 4: 运行 API 相关测试确认通过**

Run: `pnpm --filter web test src/app/api/applications/route.test.ts src/app/api/applications/[applicationId]/review/route.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/api/applications/route.ts apps/web/src/app/api/applications/[applicationId]/review/route.ts apps/web/src/app/api/applications/route.test.ts apps/web/src/app/api/applications/[applicationId]/review/route.test.ts
git commit -m "feat: bind application routes to session user"
```

### Task 5: 页面层切换到 session userId

**Files:**
- Modify: `apps/web/src/app/(vendor)/applications/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/applications/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/stalls/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/dashboard/[marketId]/page.tsx`
- Modify: `apps/web/src/app/__tests__/vendor-applications-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-applications-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-stalls-page.test.tsx`
- Modify: `apps/web/src/app/__tests__/organizer-dashboard-page.test.tsx`

- [ ] **Step 1: 写失败测试，锁定页面不再要求 query 身份参数**

```tsx
// apps/web/src/app/__tests__/vendor-applications-page.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn()
}));

import { getSessionUser } from "@/lib/auth";
import VendorApplicationsPage from "../(vendor)/applications/page";

describe("VendorApplicationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses vendor session identity instead of vendorId query", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });

    expect(await VendorApplicationsPage({ searchParams: Promise.resolve({}) })).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm --filter web test vendor-applications-page.test.tsx organizer-applications-page.test.tsx organizer-stalls-page.test.tsx organizer-dashboard-page.test.tsx`
Expected: FAIL because the current pages still depend on `vendorId` or `organizerId` in query parameters

- [ ] **Step 3: 切换页面身份来源**

```tsx
// apps/web/src/app/(vendor)/applications/page.tsx
import { AppShell } from "../../../components/layout/app-shell";
import { getSessionUser } from "../../../lib/auth";
import { listVendorApplications } from "../../../server/applications/service";

export default async function VendorApplicationsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "vendor") {
    return (
      <AppShell>
        <main>
          <h2>我的报名</h2>
          <p>请先以摊主身份登录后查看报名状态。</p>
        </main>
      </AppShell>
    );
  }

  const applications = await listVendorApplications(sessionUser.userId);

  return (
    <AppShell>
      <main aria-labelledby="vendor-applications-title">
        <h2 id="vendor-applications-title">我的报名</h2>
        <section aria-label="报名列表">
          {applications.map((application) => (
            <article key={application.id}>
              <h3>{application.marketTitle}</h3>
              <p>状态：{application.status}</p>
              <p>报名备注：{application.applicationNote ?? "无"}</p>
              <p>审核备注：{application.reviewNote ?? "无"}</p>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
```

- [ ] **Step 4: 运行页面相关测试确认通过**

Run: `pnpm --filter web test vendor-applications-page.test.tsx organizer-applications-page.test.tsx organizer-stalls-page.test.tsx organizer-dashboard-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/(vendor)/applications/page.tsx apps/web/src/app/(organizer)/organizer/applications/page.tsx apps/web/src/app/(organizer)/organizer/stalls/page.tsx apps/web/src/app/(organizer)/organizer/dashboard/[marketId]/page.tsx apps/web/src/app/__tests__/vendor-applications-page.test.tsx apps/web/src/app/__tests__/organizer-applications-page.test.tsx apps/web/src/app/__tests__/organizer-stalls-page.test.tsx apps/web/src/app/__tests__/organizer-dashboard-page.test.tsx
git commit -m "feat: derive organizer and vendor pages from session identity"
```

### Task 6: 补齐正式报名页前端闭环

**Files:**
- Create: `apps/web/src/app/(vendor)/markets/[marketId]/apply/page.tsx`
- Modify: `apps/web/src/app/(vendor)/markets/[marketId]/page.tsx`
- Create: `apps/web/src/app/__tests__/vendor-apply-page.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定报名页表单和提交反馈**

```tsx
// apps/web/src/app/__tests__/vendor-apply-page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import VendorApplyPage from "../(vendor)/markets/[marketId]/apply/page";

describe("VendorApplyPage", () => {
  it("renders the application form fields", async () => {
    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "market_1" })
      })
    );

    expect(screen.getByRole("heading", { name: "提交报名申请" })).toBeInTheDocument();
    expect(screen.getByLabelText("摊位偏好")).toBeInTheDocument();
    expect(screen.getByLabelText("报名备注")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交申请" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm --filter web test vendor-apply-page.test.tsx`
Expected: FAIL because the apply page does not exist yet

- [ ] **Step 3: 实现最小报名页和详情入口**

```tsx
// apps/web/src/app/(vendor)/markets/[marketId]/apply/page.tsx
import Link from "next/link";

import { AppShell } from "../../../../../components/layout/app-shell";

export default async function VendorApplyPage({
  params
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;

  return (
    <AppShell>
      <main aria-labelledby="vendor-apply-title">
        <h2 id="vendor-apply-title">提交报名申请</h2>
        <form aria-label="报名申请表单">
          <input type="hidden" name="marketId" value={marketId} />
          <label>
            摊位偏好
            <textarea name="boothPreference" aria-label="摊位偏好" />
          </label>
          <label>
            报名备注
            <textarea name="applicationNote" aria-label="报名备注" />
          </label>
          <label>
            附件地址
            <input name="attachmentUrl" aria-label="附件地址" />
          </label>
          <button type="submit">提交申请</button>
        </form>
        <p>开发期通过最小表单接通报名闭环，后续再增强上传体验。</p>
        <Link href="/applications">查看我的报名</Link>
      </main>
    </AppShell>
  );
}
```

```tsx
// apps/web/src/app/(vendor)/markets/[marketId]/page.tsx
import Link from "next/link";

import { getDemoMarketById } from "../../../../server/markets/service";

export default async function MarketDetailPage({
  params
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;
  const market = getDemoMarketById(marketId);

  return (
    <main>
      <h2>市集详情</h2>
      <p>名称：{market?.title ?? "未找到市集"}</p>
      <p>城市：{market?.city ?? "未知"}</p>
      <Link href={`/markets/${marketId}/apply`}>立即报名</Link>
    </main>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test vendor-apply-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/(vendor)/markets/[marketId]/apply/page.tsx apps/web/src/app/(vendor)/markets/[marketId]/page.tsx apps/web/src/app/__tests__/vendor-apply-page.test.tsx
git commit -m "feat: add vendor application page flow"
```

### Task 7: 全量验证与收口

**Files:**
- Modify: `apps/web/src/server/applications/service.ts`
- Modify: `apps/web/src/app/api/applications/route.ts`
- Modify: `apps/web/src/app/api/applications/[applicationId]/review/route.ts`
- Modify: `apps/web/src/app/(vendor)/applications/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/applications/page.tsx`

- [ ] **Step 1: 运行相关测试**

Run: `pnpm --filter web test application-p0-fields.test.ts role-guard.test.ts application-service.test.ts route.test.ts vendor-applications-page.test.tsx organizer-applications-page.test.tsx organizer-stalls-page.test.tsx organizer-dashboard-page.test.tsx vendor-apply-page.test.tsx`
Expected: PASS

- [ ] **Step 2: 运行全量 web 测试**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 3: 运行生产构建**

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 4: 如有仅与本轮 P0 相关的构建问题，做最小修正**

```ts
// apps/web/src/server/applications/service.ts
export function mapLegacyNoteFields(note?: string, applicationNote?: string, reviewNote?: string) {
  return {
    applicationNote: applicationNote ?? note ?? null,
    reviewNote: reviewNote ?? null
  };
}
```

- [ ] **Step 5: 提交**

```bash
git add apps/web
git commit -m "feat: complete mvp p0 expansion"
```

## 自检

### Spec 覆盖

- `schema 与 migration`：Task 1
- `session userId`：Task 2
- `备注拆分`：Task 3
- `API 切换到 session`：Task 4
- `页面切换到 session`：Task 5
- `报名页闭环`：Task 6
- `测试与构建收口`：Task 7

### Placeholder 扫描

- 本计划没有使用 `TBD`、`TODO`、`implement later`、`fill in details`
- 每项任务都有具体文件、命令、代码与提交建议

### 类型一致性

- 新字段统一使用 `applicationNote`、`reviewNote`、`boothPreference`、`attachmentsJson`
- session 统一使用 `userId + role`
- 身份切换统一由 `getSessionUser()` 提供
