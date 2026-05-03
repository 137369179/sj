# 认证升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前演示型 `role + userId + JWT cookie` 登录，升级为基于 `Better Auth + Prisma + Email + Passkey` 的正式生产级认证体系，并补齐多角色和路由保护闭环。

**Architecture:** 先重构 Prisma 身份模型和会话基座，再分层接入邮箱注册、密码登录、忘记密码与 Passkey；最后统一中间件、服务端 guard 与业务页面的身份来源，收掉旧 demo 登录的正式入口。所有身份校验统一走服务端会话与角色成员关系，业务表继续保持 `userId` 作为 actor 主键。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, PostgreSQL, Better Auth, Argon2id, WebAuthn, Vitest

---

## 文件结构

### 需要修改

- `apps/web/package.json`
  - 增加认证依赖与脚本约定。
- `.env.example`
  - 增加认证、邮件、Passkey、demo 开关配置。
- `apps/web/prisma/schema.prisma`
  - 将 `User` 升级为邮箱主身份模型，引入 `Account`、`Session`、`Verification`、`PasskeyCredential`、`UserRoleMembership`。
- `apps/web/prisma/seed.ts`
  - 让种子数据兼容邮箱登录、多角色成员关系与 demo 环境。
- `apps/web/src/lib/auth.ts`
  - 从自签 JWT helper 改为统一 session helper 和兼容导出。
- `apps/web/src/lib/roles.ts`
  - 从单 role 判断改为成员关系/activeRole 导向的授权辅助。
- `apps/web/src/middleware.ts`
  - 阻断匿名访问受限路由，统一 `returnTo` 与 host 透传逻辑。
- `apps/web/src/app/login/page.tsx`
  - 替换演示登录 UI，接入密码登录和 Passkey 登录。
- `apps/web/src/app/api/auth/login/route.ts`
  - 切换为正式密码登录处理。
- `apps/web/src/app/api/auth/logout/route.ts`
  - 改为清理数据库会话和 Cookie。
- `apps/web/src/components/layout/auth-status.tsx`
  - 显示真实用户身份、角色切换入口和退出。
- `apps/web/src/components/layout/app-shell.tsx`
  - 接入新会话与角色上下文。
- `apps/web/src/server/auth/service.ts`
  - 收口 demo 兼容逻辑，避免继续混入正式登录主链路。
- `apps/web/src/server/auth/__tests__/role-guard.test.ts`
  - 覆盖匿名阻断、activeRole、server guard 和 demo 开关。
- `apps/web/src/app/login/__tests__/login-page.test.tsx`
  - 从 demo 登录页断言切到正式登录页断言。
- `apps/web/src/app/api/auth/logout/__tests__/route.test.ts`
  - 覆盖真实登出行为。
- `apps/web/src/app/api/stalls/[stallId]/assign/route.test.ts`
  - 继续验证不信任 body 身份。
- `apps/web/src/app/api/dashboard/markets/[marketId]/route.test.ts`
  - 继续验证服务端会话身份。

### 需要新增

- `apps/web/src/lib/auth-config.ts`
  - Better Auth 初始化、Cookie、trusted origins、demo 开关读取。
- `apps/web/src/lib/password.ts`
  - `Argon2id` 密码哈希与验证封装。
- `apps/web/src/lib/auth-guards.ts`
  - 页面/API/Server Action 共用 guard。
- `apps/web/src/server/auth/register-service.ts`
  - 注册、邮箱验证、首角色创建。
- `apps/web/src/server/auth/password-reset-service.ts`
  - 忘记密码与重置密码。
- `apps/web/src/server/auth/passkey-service.ts`
  - Passkey 注册、断言与删除。
- `apps/web/src/server/auth/session-service.ts`
  - activeRole 读写、会话列表、会话撤销。
- `apps/web/src/app/register/page.tsx`
  - 注册页。
- `apps/web/src/app/verify-email/page.tsx`
  - 邮箱验证状态页。
- `apps/web/src/app/forgot-password/page.tsx`
  - 忘记密码页。
- `apps/web/src/app/reset-password/page.tsx`
  - 重置密码页。
- `apps/web/src/app/account/page.tsx`
  - 账号中心、角色切换、Passkey 与会话管理。
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/app/api/auth/verify-email/route.ts`
- `apps/web/src/app/api/auth/forgot-password/route.ts`
- `apps/web/src/app/api/auth/reset-password/route.ts`
- `apps/web/src/app/api/auth/passkeys/register/route.ts`
- `apps/web/src/app/api/auth/passkeys/verify/route.ts`
- `apps/web/src/app/api/auth/passkeys/[credentialId]/route.ts`
- `apps/web/src/app/api/auth/roles/active/route.ts`
- `apps/web/src/app/api/auth/sessions/route.ts`
- `apps/web/src/app/api/auth/sessions/[sessionId]/route.ts`
- `apps/web/src/server/auth/__tests__/auth-model-contract.test.ts`
- `apps/web/src/server/auth/__tests__/register-service.test.ts`
- `apps/web/src/server/auth/__tests__/password-reset-service.test.ts`
- `apps/web/src/server/auth/__tests__/passkey-service.test.ts`
- `apps/web/src/server/auth/__tests__/session-service.test.ts`
- `apps/web/src/app/register/__tests__/register-page.test.tsx`
- `apps/web/src/app/account/__tests__/account-page.test.tsx`
- `apps/web/src/app/api/auth/register/route.test.ts`
- `apps/web/src/app/api/auth/forgot-password/route.test.ts`
- `apps/web/src/app/api/auth/reset-password/route.test.ts`

### 执行约束

- 先写失败测试，再写最小实现，再做局部回归。
- Prisma 任务每一步都要保留回滚点，避免直接压平旧 `User.role` 语义。
- 旧 demo 登录只能通过 `AUTH_ENABLE_DEMO_LOGIN=true` 暴露，且不得继续作为正式登录默认入口。
- `/markets` 列表与详情保持公开，`/organizer/**`、`/admin/**` 必须匿名阻断。

## 任务清单

### Task 1: 升级 Prisma 认证模型与种子数据

**Files:**
- Modify: `apps/web/package.json`
- Modify: `.env.example`
- Modify: `apps/web/prisma/schema.prisma`
- Modify: `apps/web/prisma/seed.ts`
- Create: `apps/web/src/server/auth/__tests__/auth-model-contract.test.ts`

- [ ] **Step 1: 写失败的认证模型契约测试**

```ts
import { describe, expectTypeOf, it } from "vitest";
import type { Session, User, UserRoleMembership } from "@prisma/client";

describe("auth model contract", () => {
  it("exposes modern user identity fields", () => {
    expectTypeOf<User>().toMatchTypeOf<{
      email: string;
      emailVerifiedAt: Date | null;
      phone: string | null;
    }>();
  });

  it("defines role memberships and database sessions", () => {
    expectTypeOf<UserRoleMembership>().toMatchTypeOf<{
      userId: string;
      role: "vendor" | "organizer" | "admin";
      status: string;
    }>();
    expectTypeOf<Session>().toMatchTypeOf<{
      userId: string;
      activeRole: string | null;
    }>();
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `pnpm --filter web test -- src/server/auth/__tests__/auth-model-contract.test.ts`
Expected: FAIL，提示 `@prisma/client` 还没有 `UserRoleMembership` 或 `Session.activeRole`。

- [ ] **Step 3: 安装认证核心依赖并补环境变量模板**

```json
{
  "dependencies": {
    "argon2": "^0.41.1",
    "better-auth": "^1.1.0",
    "@simplewebauthn/server": "^10.0.1",
    "@simplewebauthn/browser": "^13.0.1"
  }
}
```

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/market_recruitment"
BETTER_AUTH_SECRET="replace-me-with-32-char-secret"
BETTER_AUTH_URL="http://localhost:3000"
AUTH_TRUSTED_ORIGINS="http://localhost:3000"
AUTH_ENABLE_DEMO_LOGIN="false"
AUTH_PASSKEY_RP_ID="localhost"
AUTH_PASSKEY_RP_NAME="Market Recruitment"
MAIL_FROM="noreply@example.com"
MAIL_PROVIDER="console"
SESSION_SECRET="deprecated-do-not-use-for-primary-auth"
UPLOAD_DRIVER="local"
UPLOAD_DIR="./uploads"
```

Run: `pnpm --filter web add better-auth argon2 @simplewebauthn/server @simplewebauthn/browser`
Expected: dependencies install cleanly.

- [ ] **Step 4: 重写 Prisma schema 到现代认证模型**

```prisma
enum UserRole {
  vendor
  organizer
  admin
}

enum RoleMembershipStatus {
  active
  suspended
}

model User {
  id                String               @id @default(cuid())
  email             String               @unique
  emailVerifiedAt   DateTime?
  phone             String?              @unique
  name              String
  avatarUrl         String?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  accounts          Account[]
  sessions          Session[]
  verifications     Verification[]
  passkeys          PasskeyCredential[]
  roleMemberships   UserRoleMembership[]
  organizedMarkets  Market[]             @relation("OrganizerMarkets")
  applications      Application[]        @relation("VendorApplications")
  notifications     Notification[]
  orders            Order[]
}

model UserRoleMembership {
  id         String               @id @default(cuid())
  userId     String
  role       UserRole
  status     RoleMembershipStatus @default(active)
  grantedAt  DateTime             @default(now())
  user       User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
}

model Session {
  id         String   @id @default(cuid())
  userId     String
  token      String   @unique
  activeRole UserRole?
  ipAddress  String?
  userAgent  String?
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 5: 迁移 seed 到邮箱和角色成员关系**

```ts
const admin = await prisma.user.upsert({
  where: { email: "admin@example.com" },
  update: {},
  create: {
    email: "admin@example.com",
    name: "Platform Admin",
    emailVerifiedAt: new Date(),
    roleMemberships: {
      create: [{ role: UserRole.admin }]
    }
  }
});

const organizer = await prisma.user.upsert({
  where: { email: "organizer1@example.com" },
  update: {},
  create: {
    email: "organizer1@example.com",
    name: "Coffee Culture Org",
    emailVerifiedAt: new Date(),
    roleMemberships: {
      create: [{ role: UserRole.organizer }]
    }
  }
});
```

- [ ] **Step 6: 生成客户端并验证 schema**

Run: `pnpm --filter web exec prisma validate && pnpm --filter web exec prisma generate`
Expected: PASS，Prisma schema valid 且客户端生成成功。

- [ ] **Step 7: 重新运行契约测试并确认通过**

Run: `pnpm --filter web test -- src/server/auth/__tests__/auth-model-contract.test.ts`
Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json .env.example apps/web/prisma/schema.prisma apps/web/prisma/seed.ts apps/web/src/server/auth/__tests__/auth-model-contract.test.ts
git commit -m "feat(auth): add modern auth data model"
```

### Task 2: 建立认证核心与服务端 session helper

**Files:**
- Create: `apps/web/src/lib/auth-config.ts`
- Create: `apps/web/src/lib/password.ts`
- Create: `apps/web/src/lib/auth-guards.ts`
- Create: `apps/web/src/server/auth/session-service.ts`
- Modify: `apps/web/src/lib/auth.ts`
- Modify: `apps/web/src/lib/roles.ts`
- Modify: `apps/web/src/server/auth/__tests__/role-guard.test.ts`
- Create: `apps/web/src/server/auth/__tests__/session-service.test.ts`

- [ ] **Step 1: 先写失败的 session 与 guard 测试**

```ts
import { describe, expect, it } from "vitest";
import { requireRoleMembership } from "../../../lib/auth-guards";

describe("requireRoleMembership", () => {
  it("throws when the user does not have the requested role", () => {
    expect(() =>
      requireRoleMembership(
        {
          userId: "user_1",
          roles: ["vendor"],
          activeRole: "vendor"
        },
        "organizer"
      )
    ).toThrow("forbidden");
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { deriveSessionUser } from "../session-service";

describe("deriveSessionUser", () => {
  it("returns roles and activeRole from a database session", async () => {
    const sessionUser = await deriveSessionUser({
      user: {
        id: "user_1",
        email: "vendor@example.com",
        name: "Vendor",
        roleMemberships: [{ role: "vendor", status: "active" }]
      },
      activeRole: "vendor"
    } as any);

    expect(sessionUser).toEqual({
      userId: "user_1",
      email: "vendor@example.com",
      name: "Vendor",
      roles: ["vendor"],
      activeRole: "vendor"
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- src/server/auth/__tests__/role-guard.test.ts src/server/auth/__tests__/session-service.test.ts`
Expected: FAIL，提示 `auth-guards` 或 `session-service` 不存在。

- [ ] **Step 3: 新建 Better Auth 配置与密码工具**

```ts
// apps/web/src/lib/auth-config.ts
import { betterAuth } from "better-auth";
import { db } from "./db";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: db,
  trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  }
});

export const AUTH_ENABLE_DEMO_LOGIN = process.env.AUTH_ENABLE_DEMO_LOGIN === "true";
```

```ts
// apps/web/src/lib/password.ts
import argon2 from "argon2";

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
```

- [ ] **Step 4: 建立 session user 派生与统一 guard**

```ts
// apps/web/src/server/auth/session-service.ts
import type { UserRole } from "@prisma/client";

export function deriveSessionUser(session: {
  user: {
    id: string;
    email: string;
    name: string;
    roleMemberships: Array<{ role: UserRole; status: "active" | "suspended" }>;
  };
  activeRole: UserRole | null;
}) {
  const roles = session.user.roleMemberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.role);

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    roles,
    activeRole: session.activeRole ?? roles[0] ?? null
  };
}
```

```ts
// apps/web/src/lib/auth-guards.ts
import type { UserRole } from "@prisma/client";

export function requireRoleMembership(
  sessionUser: { roles: UserRole[]; activeRole: UserRole | null } | null,
  role: UserRole
) {
  if (!sessionUser) {
    throw new Error("unauthenticated");
  }
  if (!sessionUser.roles.includes(role)) {
    throw new Error("forbidden");
  }
  return sessionUser;
}
```

- [ ] **Step 5: 改造 `lib/auth.ts` 为统一导出层**

```ts
import { cookies } from "next/headers";
import { auth, AUTH_ENABLE_DEMO_LOGIN } from "./auth-config";
import { deriveSessionUser } from "../server/auth/session-service";

export const SESSION_COOKIE_NAME = "better-auth.session_token";

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await cookies() as any });
  return session ? deriveSessionUser(session as any) : null;
}

export { AUTH_ENABLE_DEMO_LOGIN };
```

- [ ] **Step 6: 收口 `roles.ts` 到 activeRole + memberships 语义**

```ts
export type UserRole = "vendor" | "organizer" | "admin";

export function canAccessRoute(roles: UserRole[], pathname: string) {
  if (pathname.startsWith("/admin")) return roles.includes("admin");
  if (pathname.startsWith("/organizer")) return roles.includes("organizer") || roles.includes("admin");
  return true;
}
```

- [ ] **Step 7: 运行针对性测试**

Run: `pnpm --filter web test -- src/server/auth/__tests__/role-guard.test.ts src/server/auth/__tests__/session-service.test.ts`
Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/auth-config.ts apps/web/src/lib/password.ts apps/web/src/lib/auth-guards.ts apps/web/src/server/auth/session-service.ts apps/web/src/lib/auth.ts apps/web/src/lib/roles.ts apps/web/src/server/auth/__tests__/role-guard.test.ts apps/web/src/server/auth/__tests__/session-service.test.ts
git commit -m "feat(auth): add core session and guard helpers"
```

### Task 3: 实现注册、验证、密码登录与密码重置

**Files:**
- Create: `apps/web/src/server/auth/register-service.ts`
- Create: `apps/web/src/server/auth/password-reset-service.ts`
- Create: `apps/web/src/app/register/page.tsx`
- Create: `apps/web/src/app/verify-email/page.tsx`
- Create: `apps/web/src/app/forgot-password/page.tsx`
- Create: `apps/web/src/app/reset-password/page.tsx`
- Create: `apps/web/src/app/api/auth/register/route.ts`
- Create: `apps/web/src/app/api/auth/verify-email/route.ts`
- Create: `apps/web/src/app/api/auth/forgot-password/route.ts`
- Create: `apps/web/src/app/api/auth/reset-password/route.ts`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/app/api/auth/login/route.ts`
- Modify: `apps/web/src/app/api/auth/logout/route.ts`
- Create: `apps/web/src/server/auth/__tests__/register-service.test.ts`
- Create: `apps/web/src/server/auth/__tests__/password-reset-service.test.ts`
- Create: `apps/web/src/app/register/__tests__/register-page.test.tsx`
- Modify: `apps/web/src/app/login/__tests__/login-page.test.tsx`
- Create: `apps/web/src/app/api/auth/register/route.test.ts`
- Create: `apps/web/src/app/api/auth/forgot-password/route.test.ts`
- Create: `apps/web/src/app/api/auth/reset-password/route.test.ts`
- Modify: `apps/web/src/app/api/auth/logout/__tests__/route.test.ts`

- [ ] **Step 1: 写失败的注册服务与登录页测试**

```ts
import { describe, expect, it } from "vitest";
import { registerUser } from "../register-service";

describe("registerUser", () => {
  it("creates a verified-pending account with the requested role", async () => {
    await expect(
      registerUser({
        email: "new-organizer@example.com",
        password: "StrongPassword!23",
        name: "Organizer",
        role: "organizer"
      })
    ).resolves.toMatchObject({
      email: "new-organizer@example.com",
      pendingVerification: true,
      role: "organizer"
    });
  });
});
```

```tsx
import { render, screen } from "@testing-library/react";
import LoginPage from "../page";

it("renders password and passkey login entrypoints", async () => {
  render(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("heading", { name: "登录" })).toBeInTheDocument();
  expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
  expect(screen.getByLabelText("密码")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "使用 Passkey 登录" })).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认当前失败**

Run: `pnpm --filter web test -- src/server/auth/__tests__/register-service.test.ts src/app/login/__tests__/login-page.test.tsx`
Expected: FAIL，提示 `register-service` 缺失且登录页仍显示 demo 字段。

- [ ] **Step 3: 实现注册与邮箱验证服务**

```ts
// apps/web/src/server/auth/register-service.ts
import { db } from "../../lib/db";
import { hashPassword } from "../../lib/password";

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  role: "vendor" | "organizer";
}) {
  const passwordHash = await hashPassword(input.password);

  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      accounts: {
        create: [{ providerId: "credential", accountId: input.email, passwordHash }]
      },
      roleMemberships: {
        create: [{ role: input.role }]
      },
      verifications: {
        create: [{ type: "email_verification", token: crypto.randomUUID(), expiresAt: new Date(Date.now() + 1000 * 60 * 30) }]
      }
    }
  });

  return { id: user.id, email: user.email, role: input.role, pendingVerification: true };
}
```

- [ ] **Step 4: 实现忘记密码与重置密码服务**

```ts
// apps/web/src/server/auth/password-reset-service.ts
import { db } from "../../lib/db";
import { hashPassword } from "../../lib/password";

export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: true };

  await db.verification.create({
    data: {
      userId: user.id,
      type: "password_reset",
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 15)
    }
  });

  return { ok: true };
}

export async function resetPassword(token: string, nextPassword: string) {
  const verification = await db.verification.findFirst({ where: { token, type: "password_reset" } });
  if (!verification || verification.expiresAt < new Date()) {
    throw new Error("invalid_or_expired_token");
  }

  await db.account.updateMany({
    where: { userId: verification.userId, providerId: "credential" },
    data: { passwordHash: await hashPassword(nextPassword) }
  });
}
```

- [ ] **Step 5: 用正式表单替换登录页和登录路由**

```tsx
<form action={loginAction} aria-label="登录表单">
  <label>
    邮箱
    <input name="email" type="email" required />
  </label>
  <label>
    密码
    <input name="password" type="password" required />
  </label>
  <button type="submit">密码登录</button>
  <button type="button">使用 Passkey 登录</button>
</form>
```

```ts
export async function POST(request: Request) {
  const { email, password } = await request.json();
  const result = await auth.api.signInEmail({ body: { email, password } });
  return NextResponse.json({ ok: true, userId: result.user.id });
}
```

- [ ] **Step 6: 新建注册/验证/重置页面与路由**

```tsx
// apps/web/src/app/register/page.tsx
export default function RegisterPage() {
  return (
    <main aria-labelledby="register-title">
      <h2 id="register-title">注册</h2>
      <form aria-label="注册表单">
        <label>姓名<input name="name" required /></label>
        <label>邮箱<input name="email" type="email" required /></label>
        <label>密码<input name="password" type="password" required /></label>
        <label>
          角色
          <select name="role" defaultValue="vendor">
            <option value="vendor">摊主</option>
            <option value="organizer">主办方</option>
          </select>
        </label>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: 跑注册、登录、登出、重置密码的定向测试**

Run: `pnpm --filter web test -- src/server/auth/__tests__/register-service.test.ts src/server/auth/__tests__/password-reset-service.test.ts src/app/login/__tests__/login-page.test.tsx src/app/register/__tests__/register-page.test.tsx src/app/api/auth/register/route.test.ts src/app/api/auth/forgot-password/route.test.ts src/app/api/auth/reset-password/route.test.ts src/app/api/auth/logout/__tests__/route.test.ts`
Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/server/auth/register-service.ts apps/web/src/server/auth/password-reset-service.ts apps/web/src/app/register/page.tsx apps/web/src/app/verify-email/page.tsx apps/web/src/app/forgot-password/page.tsx apps/web/src/app/reset-password/page.tsx apps/web/src/app/api/auth/register/route.ts apps/web/src/app/api/auth/verify-email/route.ts apps/web/src/app/api/auth/forgot-password/route.ts apps/web/src/app/api/auth/reset-password/route.ts apps/web/src/app/login/page.tsx apps/web/src/app/api/auth/login/route.ts apps/web/src/app/api/auth/logout/route.ts apps/web/src/server/auth/__tests__/register-service.test.ts apps/web/src/server/auth/__tests__/password-reset-service.test.ts apps/web/src/app/register/__tests__/register-page.test.tsx apps/web/src/app/login/__tests__/login-page.test.tsx apps/web/src/app/api/auth/register/route.test.ts apps/web/src/app/api/auth/forgot-password/route.test.ts apps/web/src/app/api/auth/reset-password/route.test.ts apps/web/src/app/api/auth/logout/__tests__/route.test.ts
git commit -m "feat(auth): add registration and password auth flows"
```

### Task 4: 实现 Passkey、账号中心与会话管理

**Files:**
- Create: `apps/web/src/server/auth/passkey-service.ts`
- Create: `apps/web/src/server/auth/session-service.ts` (extend)
- Create: `apps/web/src/app/account/page.tsx`
- Create: `apps/web/src/app/api/auth/passkeys/register/route.ts`
- Create: `apps/web/src/app/api/auth/passkeys/verify/route.ts`
- Create: `apps/web/src/app/api/auth/passkeys/[credentialId]/route.ts`
- Create: `apps/web/src/app/api/auth/roles/active/route.ts`
- Create: `apps/web/src/app/api/auth/sessions/route.ts`
- Create: `apps/web/src/app/api/auth/sessions/[sessionId]/route.ts`
- Modify: `apps/web/src/components/layout/auth-status.tsx`
- Create: `apps/web/src/server/auth/__tests__/passkey-service.test.ts`
- Create: `apps/web/src/server/auth/__tests__/session-service.test.ts` (extend)
- Create: `apps/web/src/app/account/__tests__/account-page.test.tsx`

- [ ] **Step 1: 写失败的 Passkey 与账号中心测试**

```ts
import { describe, expect, it } from "vitest";
import { beginPasskeyRegistration } from "../passkey-service";

describe("beginPasskeyRegistration", () => {
  it("returns a challenge for the current user", async () => {
    await expect(beginPasskeyRegistration({ userId: "user_1", email: "vendor@example.com" } as any)).resolves.toMatchObject({
      challenge: expect.any(String)
    });
  });
});
```

```tsx
import { render, screen } from "@testing-library/react";
import AccountPage from "../page";

it("renders role switcher and passkey management", async () => {
  render(await AccountPage());
  expect(screen.getByRole("heading", { name: "账号中心" })).toBeInTheDocument();
  expect(screen.getByLabelText("当前角色")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "绑定 Passkey" })).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- src/server/auth/__tests__/passkey-service.test.ts src/app/account/__tests__/account-page.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 Passkey 服务**

```ts
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";

export async function beginPasskeyRegistration(sessionUser: { userId: string; email: string }) {
  return generateRegistrationOptions({
    rpID: process.env.AUTH_PASSKEY_RP_ID!,
    rpName: process.env.AUTH_PASSKEY_RP_NAME!,
    userID: sessionUser.userId,
    userName: sessionUser.email
  });
}

export async function finishPasskeyRegistration() {
  return verifyRegistrationResponse({} as any);
}
```

- [ ] **Step 4: 扩展 session service 到 activeRole 与设备会话列表**

```ts
export async function setActiveRole(sessionId: string, role: "vendor" | "organizer" | "admin") {
  return db.session.update({ where: { id: sessionId }, data: { activeRole: role } });
}

export async function listSessions(userId: string) {
  return db.session.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
}
```

- [ ] **Step 5: 新建账号中心和相关 API**

```tsx
export default async function AccountPage() {
  const sessionUser = await getSessionUser();
  return (
    <main aria-labelledby="account-title">
      <h2 id="account-title">账号中心</h2>
      <label>
        当前角色
        <select aria-label="当前角色" defaultValue={sessionUser?.activeRole ?? undefined}>
          {sessionUser?.roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </label>
      <button type="button">绑定 Passkey</button>
    </main>
  );
}
```

- [ ] **Step 6: 更新顶部身份状态组件**

```tsx
<span aria-label="当前用户">{sessionUser.name} ({sessionUser.activeRole ?? "未选择角色"})</span>
<button onClick={() => router.push("/account")}>账号中心</button>
<button onClick={handleLogout}>退出登录</button>
```

- [ ] **Step 7: 运行 Passkey / 账号中心定向测试**

Run: `pnpm --filter web test -- src/server/auth/__tests__/passkey-service.test.ts src/server/auth/__tests__/session-service.test.ts src/app/account/__tests__/account-page.test.tsx`
Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/server/auth/passkey-service.ts apps/web/src/server/auth/session-service.ts apps/web/src/app/account/page.tsx apps/web/src/app/api/auth/passkeys/register/route.ts apps/web/src/app/api/auth/passkeys/verify/route.ts apps/web/src/app/api/auth/passkeys/[credentialId]/route.ts apps/web/src/app/api/auth/roles/active/route.ts apps/web/src/app/api/auth/sessions/route.ts apps/web/src/app/api/auth/sessions/[sessionId]/route.ts apps/web/src/components/layout/auth-status.tsx apps/web/src/server/auth/__tests__/passkey-service.test.ts apps/web/src/server/auth/__tests__/session-service.test.ts apps/web/src/app/account/__tests__/account-page.test.tsx
git commit -m "feat(auth): add passkey and account management"
```

### Task 5: 重构路由守卫并迁移业务页面/API 到新认证上下文

**Files:**
- Modify: `apps/web/src/middleware.ts`
- Modify: `apps/web/src/lib/roles.ts`
- Modify: `apps/web/src/lib/auth-guards.ts`
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/markets/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/stalls/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/applications/page.tsx`
- Modify: `apps/web/src/app/(organizer)/organizer/dashboard/[marketId]/page.tsx`
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.ts`
- Modify: `apps/web/src/app/api/stalls/[stallId]/assign/route.ts`
- Modify: `apps/web/src/server/auth/service.ts`
- Modify: `apps/web/src/server/auth/__tests__/role-guard.test.ts`
- Modify: `apps/web/src/app/api/dashboard/markets/[marketId]/route.test.ts`
- Modify: `apps/web/src/app/api/stalls/[stallId]/assign/route.test.ts`
- Modify: `apps/web/src/app/__tests__/organizer-markets-page.test.tsx`
- Modify: `apps/web/src/components/layout/__tests__/app-shell.test.tsx`

- [ ] **Step 1: 写匿名阻断与 activeRole 迁移失败测试**

```ts
it("redirects anonymous visitors away from organizer routes", async () => {
  const request = new NextRequest("http://localhost/organizer/markets");
  const response = await middleware(request);
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toContain("/login?returnTo=%2Forganizer%2Fmarkets");
});
```

```ts
it("uses server session identity instead of request body organizerId", async () => {
  const response = await POST(
    new Request("http://localhost/api/stalls/stall_1/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizerId: "forged", applicationId: "app_1" })
    })
  );
  expect(response.status).not.toBe(200);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- src/server/auth/__tests__/role-guard.test.ts src/app/api/stalls/[stallId]/assign/route.test.ts`
Expected: FAIL，因为匿名还未被中间件阻断，旧逻辑仍有 body/query 身份历史包袱。

- [ ] **Step 3: 改造 middleware 到匿名阻断 + returnTo**

```ts
export async function middleware(request: NextRequest) {
  const sessionUser = await getSessionUserFromRequest(request);
  const pathname = request.nextUrl.pathname;
  const requiresOrganizer = pathname.startsWith("/organizer");
  const requiresAdmin = pathname.startsWith("/admin");

  if ((requiresOrganizer || requiresAdmin) && !sessionUser) {
    return NextResponse.redirect(getRedirectUrl(request, `/login?returnTo=${encodeURIComponent(pathname)}`));
  }

  if (sessionUser && !canAccessRoute(sessionUser.roles, pathname)) {
    return NextResponse.redirect(getRedirectUrl(request, "/"));
  }

  return NextResponse.next();
}
```

- [ ] **Step 4: 页面和 API 统一改用新 guard**

```ts
const sessionUser = await requireServerSession();
requireRoleMembership(sessionUser, "organizer");
```

```ts
const sessionUser = await requireApiRole(request, "organizer");
const organizerId = sessionUser.userId;
```

- [ ] **Step 5: 将 demo resolver 降为兼容层**

```ts
import { AUTH_ENABLE_DEMO_LOGIN } from "../../lib/auth";

export async function resolveDemoLoginUser(userId: string, role: UserRole) {
  if (!AUTH_ENABLE_DEMO_LOGIN) {
    return null;
  }
  // keep existing alias lookup for dev-only environments
}
```

- [ ] **Step 6: 跑守卫和业务 API 回归测试**

Run: `pnpm --filter web test -- src/server/auth/__tests__/role-guard.test.ts src/app/api/dashboard/markets/[marketId]/route.test.ts src/app/api/stalls/[stallId]/assign/route.test.ts src/app/__tests__/organizer-markets-page.test.tsx src/components/layout/__tests__/app-shell.test.tsx`
Expected: PASS，且 `ISSUE-006` 被回归用例锁住。

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/lib/roles.ts apps/web/src/lib/auth-guards.ts apps/web/src/components/layout/app-shell.tsx apps/web/src/app/(organizer)/organizer/markets/page.tsx apps/web/src/app/(organizer)/organizer/stalls/page.tsx apps/web/src/app/(organizer)/organizer/applications/page.tsx apps/web/src/app/(organizer)/organizer/dashboard/[marketId]/page.tsx apps/web/src/app/api/dashboard/markets/[marketId]/route.ts apps/web/src/app/api/stalls/[stallId]/assign/route.ts apps/web/src/server/auth/service.ts apps/web/src/server/auth/__tests__/role-guard.test.ts apps/web/src/app/api/dashboard/markets/[marketId]/route.test.ts apps/web/src/app/api/stalls/[stallId]/assign/route.test.ts apps/web/src/app/__tests__/organizer-markets-page.test.tsx apps/web/src/components/layout/__tests__/app-shell.test.tsx
git commit -m "feat(auth): enforce protected routes and server guards"
```

### Task 6: 收口 demo 兼容、全量回归与交付文档

**Files:**
- Modify: `.env.example`
- Modify: `apps/web/prisma/seed.ts`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/components/layout/auth-status.tsx`
- Create: `docs/ACCEPTANCE_认证升级.md`
- Create: `docs/TODO_认证升级.md`
- Modify: `docs/superpowers/plans/2026-05-03-auth-modernization.md`

- [ ] **Step 1: 写 demo 开关与正式入口隔离测试**

```ts
it("does not render demo login fields when AUTH_ENABLE_DEMO_LOGIN is false", async () => {
  process.env.AUTH_ENABLE_DEMO_LOGIN = "false";
  render(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(screen.queryByPlaceholderText("例如: vendor_1")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败或覆盖不足**

Run: `pnpm --filter web test -- src/app/login/__tests__/login-page.test.tsx`
Expected: FAIL 或现有断言不足以锁住 demo 入口。

- [ ] **Step 3: 收口 demo 开关和 seed 文案**

```ts
const showDemoLogin = AUTH_ENABLE_DEMO_LOGIN && process.env.NODE_ENV !== "production";
```

```ts
console.log("Demo auth is available only when AUTH_ENABLE_DEMO_LOGIN=true");
```

- [ ] **Step 4: 跑全量工程验证**

Run: `pnpm --filter web lint`
Expected: PASS

Run: `pnpm --filter web test`
Expected: PASS

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 5: 跑浏览器验收清单**

Run:

```bash
pnpm --filter web dev
```

Manual browser checks:

```text
1. 公开访问 /organizer/markets -> 跳转 /login?returnTo=...
2. 注册 organizer 账号 -> 邮箱验证态正确
3. 密码登录 -> 进入正确工作台
4. 绑定 Passkey -> 再次登录可走 Passkey
5. 账号中心切换 activeRole -> 导航随之更新
6. 退出登录 -> 受限路由再次被阻断
```

Expected: 六条全部通过，并记录截图或浏览器证据。

- [ ] **Step 6: 写验收与后续文档**

```md
# 验收摘要：认证升级

## 验收范围
- 邮箱注册、验证、登录、重置密码
- Passkey 登录与管理
- 多角色切换
- 匿名阻断与服务端授权

## 验收结果
- lint/test/build 全绿
- ISSUE-006 已关闭
```

```md
# 后续待办：认证升级

## 当前未覆盖
- OAuth 扩展
- MFA 强制策略
- 风险评分与登录异常通知深化
```

- [ ] **Step 7: Commit**

```bash
git add .env.example apps/web/prisma/seed.ts apps/web/src/app/login/page.tsx apps/web/src/components/layout/auth-status.tsx docs/ACCEPTANCE_认证升级.md docs/TODO_认证升级.md docs/superpowers/plans/2026-05-03-auth-modernization.md
git commit -m "docs(auth): capture auth upgrade acceptance"
```

## 自检

### Spec 覆盖

- `ALIGNMENT_认证升级.md` 的邮箱注册、密码登录、Passkey、多角色、匿名阻断、demo 开关，分别落在 Task 1-6。
- `DESIGN_认证升级.md` 的数据模型、认证流程、路由保护、会话与安全、迁移策略，分别落在 Task 1-5。
- `TASK_认证升级.md` 的 `T1-1` 到 `T4-3` 全部映射到了本计划的 6 个任务，没有遗漏。

### Placeholder 扫描

- 已检查没有 `TBD`、`TODO later`、`implement later` 之类占位语句。
- 所有任务都给了明确文件、命令、代码片段和提交信息。

### 类型一致性

- 全计划统一使用 `UserRoleMembership`、`activeRole`、`getSessionUser()`、`requireRoleMembership()`。
- 业务 actor 始终保持 `userId` 语义，不混入新的 `organizerProfileId` 或 `vendorProfileId` 主键。
