# 首页标准落地页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前只有占位文案的首页升级为一版完整、可展示、可继续承接后续业务页面的标准产品落地页。

**Architecture:** 继续复用现有 `AppShell` 作为导航外壳，在 `apps/web/src/components/marketing/` 下拆出首页的 5 个展示区块组件，并在首页文件中组装。样式采用 `globals.css + 语义化 className` 的轻量方案，避免引入新的 UI 库，同时通过 1 个现有壳测试和 1 个首页测试锁定关键信息与入口。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, CSS

---

## 文件结构

### 需要修改

- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Modify: `apps/web/src/components/layout/__tests__/app-shell.test.tsx`

### 需要新增

- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/components/marketing/hero-section.tsx`
- Create: `apps/web/src/components/marketing/value-section.tsx`
- Create: `apps/web/src/components/marketing/flow-section.tsx`
- Create: `apps/web/src/components/marketing/role-section.tsx`
- Create: `apps/web/src/components/marketing/cta-section.tsx`
- Create: `apps/web/src/app/__tests__/home-page.test.tsx`

## 设计落实范围

本计划只实现以下内容：

- 顶部导航轻量增强
- Hero 首屏
- 平台价值区
- 核心流程区
- 双角色入口区
- 底部 CTA 与页脚
- 首页关键结构测试

本计划不实现：

- 登录态
- 数据获取
- 活动列表真实数据
- 后台管理逻辑
- 复杂响应式断点测试

### Task 1: 建立首页测试并定义内容骨架

**Files:**
- Create: `apps/web/src/app/__tests__/home-page.test.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Test: `apps/web/src/app/__tests__/home-page.test.tsx`

- [ ] **Step 1: 写失败测试，锁定首页关键内容**

```tsx
// apps/web/src/app/__tests__/home-page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../page";

describe("HomePage", () => {
  it("renders the landing page headline and primary actions", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "让市集招募、报名与管理更高效" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "查看招募活动" })
    ).toHaveAttribute("href", "/markets");
    expect(
      screen.getByRole("link", { name: "进入主办方端" })
    ).toHaveAttribute("href", "/organizer/markets");
    expect(screen.getByText("我是摊主")).toBeInTheDocument();
    expect(screen.getByText("我是主办方")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认按预期失败**

Run: `pnpm --filter web test home-page.test.tsx`
Expected: FAIL because the current homepage only renders the placeholder text and does not contain the landing-page headline or CTA links

- [ ] **Step 3: 先用最小占位实现让测试表达清楚**

```tsx
// apps/web/src/app/page.tsx
import { AppShell } from "../components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <main>
        <section>
          <h2>让市集招募、报名与管理更高效</h2>
          <p>
            面向主办方与摊主的一体化运营平台，覆盖活动发布、报名管理与执行协同。
          </p>
          <a href="/markets">查看招募活动</a>
          <a href="/organizer/markets">进入主办方端</a>
        </section>
        <section>
          <h3>我是摊主</h3>
        </section>
        <section>
          <h3>我是主办方</h3>
        </section>
      </main>
    </AppShell>
  );
}
```

- [ ] **Step 4: 运行测试，确认转绿**

Run: `pnpm --filter web test home-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/__tests__/home-page.test.tsx
git commit -m "test: define homepage landing content expectations"
```

### Task 2: 拆分首页营销区块组件

**Files:**
- Create: `apps/web/src/components/marketing/hero-section.tsx`
- Create: `apps/web/src/components/marketing/value-section.tsx`
- Create: `apps/web/src/components/marketing/flow-section.tsx`
- Create: `apps/web/src/components/marketing/role-section.tsx`
- Create: `apps/web/src/components/marketing/cta-section.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Test: `apps/web/src/app/__tests__/home-page.test.tsx`

- [ ] **Step 1: 扩展失败测试，锁定 6 个区块里的关键文案**

```tsx
// apps/web/src/app/__tests__/home-page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../page";

describe("HomePage", () => {
  it("renders the landing page headline and primary actions", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "让市集招募、报名与管理更高效" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "查看招募活动" })
    ).toHaveAttribute("href", "/markets");
    expect(
      screen.getByRole("link", { name: "进入主办方端" })
    ).toHaveAttribute("href", "/organizer/markets");
  });

  it("renders value cards and process steps", () => {
    render(<HomePage />);

    expect(screen.getByText("活动发布更集中")).toBeInTheDocument();
    expect(screen.getByText("报名流程更清晰")).toBeInTheDocument();
    expect(screen.getByText("协同管理更省心")).toBeInTheDocument();
    expect(screen.getByText("发布活动")).toBeInTheDocument();
    expect(screen.getByText("摊主报名")).toBeInTheDocument();
    expect(screen.getByText("审核沟通")).toBeInTheDocument();
    expect(screen.getByText("现场执行")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认新增断言失败**

Run: `pnpm --filter web test home-page.test.tsx`
Expected: FAIL because the current homepage does not render the value section or process section

- [ ] **Step 3: 按区块拆分组件并组装首页**

```tsx
// apps/web/src/components/marketing/hero-section.tsx
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <p className="eyebrow">市集招募平台</p>
      <h2 id="hero-title">让市集招募、报名与管理更高效</h2>
      <p className="hero-copy">
        面向主办方与摊主的一体化运营平台，覆盖活动发布、报名管理与执行协同。
      </p>
      <div className="hero-actions">
        <Link href="/markets" className="button button-primary">
          查看招募活动
        </Link>
        <Link href="/organizer/markets" className="button button-secondary">
          进入主办方端
        </Link>
      </div>
    </section>
  );
}
```

```tsx
// apps/web/src/components/marketing/value-section.tsx
const values = [
  {
    title: "活动发布更集中",
    description: "主办方统一发布活动信息，减少招募渠道分散带来的沟通成本。"
  },
  {
    title: "报名流程更清晰",
    description: "摊主可以快速查看活动要求、进入报名流程并追踪结果。"
  },
  {
    title: "协同管理更省心",
    description: "从审核到执行的关键节点被统一管理，减少线下反复确认。"
  }
];

export function ValueSection() {
  return (
    <section className="value-section" aria-labelledby="value-title">
      <h3 id="value-title">为什么使用这套平台</h3>
      <div className="value-grid">
        {values.map((value) => (
          <article key={value.title} className="info-card">
            <h4>{value.title}</h4>
            <p>{value.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// apps/web/src/components/marketing/flow-section.tsx
const steps = ["发布活动", "摊主报名", "审核沟通", "现场执行"];

export function FlowSection() {
  return (
    <section className="flow-section" aria-labelledby="flow-title">
      <h3 id="flow-title">核心流程</h3>
      <ol className="flow-list">
        {steps.map((step, index) => (
          <li key={step} className="flow-item">
            <span className="flow-index">0{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

```tsx
// apps/web/src/components/marketing/role-section.tsx
import Link from "next/link";

export function RoleSection() {
  return (
    <section className="role-section" aria-labelledby="role-title">
      <h3 id="role-title">选择你的使用路径</h3>
      <div className="role-grid">
        <article className="role-card">
          <h4>我是摊主</h4>
          <p>快速查看招募信息、选择合适市集并完成报名。</p>
          <Link href="/markets" className="button button-primary">
            去摊主端
          </Link>
        </article>
        <article className="role-card">
          <h4>我是主办方</h4>
          <p>统一发布活动、管理报名与跟进执行。</p>
          <Link href="/organizer/markets" className="button button-secondary">
            去主办方端
          </Link>
        </article>
      </div>
    </section>
  );
}
```

```tsx
// apps/web/src/components/marketing/cta-section.tsx
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="cta-section" aria-labelledby="cta-title">
      <h3 id="cta-title">现在开始建立更清晰的市集协作流程</h3>
      <div className="hero-actions">
        <Link href="/markets" className="button button-primary">
          查看招募活动
        </Link>
        <Link href="/organizer/markets" className="button button-secondary">
          进入主办方端
        </Link>
      </div>
      <p className="footer-note">市集活动摊主招募与运营管理平台</p>
    </section>
  );
}
```

```tsx
// apps/web/src/app/page.tsx
import { CtaSection } from "../components/marketing/cta-section";
import { FlowSection } from "../components/marketing/flow-section";
import { HeroSection } from "../components/marketing/hero-section";
import { RoleSection } from "../components/marketing/role-section";
import { ValueSection } from "../components/marketing/value-section";
import { AppShell } from "../components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <main className="landing-page">
        <HeroSection />
        <ValueSection />
        <FlowSection />
        <RoleSection />
        <CtaSection />
      </main>
    </AppShell>
  );
}
```

- [ ] **Step 4: 运行测试，确认组件化实现保持绿灯**

Run: `pnpm --filter web test home-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/page.tsx apps/web/src/components/marketing apps/web/src/app/__tests__/home-page.test.tsx
git commit -m "feat: add homepage marketing sections"
```

### Task 3: 为首页添加全局样式与布局层级

**Files:**
- Create: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Test: `apps/web/src/app/__tests__/home-page.test.tsx`

- [ ] **Step 1: 写失败测试，锁定页面语义结构**

```tsx
// apps/web/src/app/__tests__/home-page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../page";

describe("HomePage", () => {
  it("renders the landing page headline and primary actions", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "让市集招募、报名与管理更高效" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "查看招募活动" })
    ).toHaveAttribute("href", "/markets");
    expect(
      screen.getByRole("link", { name: "进入主办方端" })
    ).toHaveAttribute("href", "/organizer/markets");
  });

  it("renders value cards and process steps", () => {
    render(<HomePage />);

    expect(screen.getByText("活动发布更集中")).toBeInTheDocument();
    expect(screen.getByText("发布活动")).toBeInTheDocument();
  });

  it("renders one main region and multiple named sections", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("region")).toHaveLength(5);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认语义断言先失败**

Run: `pnpm --filter web test home-page.test.tsx`
Expected: FAIL because the current sections do not all expose accessible region names

- [ ] **Step 3: 添加全局样式并修正区块语义**

```css
/* apps/web/src/app/globals.css */
:root {
  color-scheme: light;
  --bg: #f6f1e8;
  --panel: #fffaf2;
  --text: #2f241b;
  --muted: #6f5b4b;
  --accent: #c96f3b;
  --accent-dark: #9f4f23;
  --border: #e7d8c7;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

.app-shell {
  min-height: 100vh;
}

.shell-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 250, 242, 0.92);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}

.brand {
  font-size: 1.125rem;
  font-weight: 700;
}

.shell-nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.landing-page {
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
  display: grid;
  gap: 1.5rem;
}

.hero-section,
.value-section,
.flow-section,
.role-section,
.cta-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: var(--accent-dark);
  font-size: 0.875rem;
  font-weight: 700;
}

.hero-copy,
.footer-note,
.info-card p,
.role-card p {
  color: var(--muted);
  line-height: 1.7;
}

.hero-actions,
.role-grid,
.value-grid {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.value-grid,
.role-grid {
  margin-top: 1rem;
}

.info-card,
.role-card {
  flex: 1 1 220px;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #fff;
}

.flow-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  gap: 0.75rem;
}

.flow-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
}

.flow-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: #f4dfcf;
  color: var(--accent-dark);
  font-weight: 700;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
}

.button-primary {
  background: var(--accent);
  color: #fff;
}

.button-secondary {
  background: transparent;
  color: var(--accent-dark);
  border-color: var(--accent);
}

@media (max-width: 640px) {
  .shell-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .landing-page {
    width: min(100% - 1rem, 1100px);
    padding-top: 1rem;
  }
}
```

```tsx
// apps/web/src/app/layout.tsx
import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// apps/web/src/components/marketing/hero-section.tsx
import Link from "next/link";

export function HeroSection() {
  return (
    <section
      className="hero-section"
      aria-labelledby="hero-title"
      role="region"
    >
      <p className="eyebrow">市集招募平台</p>
      <h2 id="hero-title">让市集招募、报名与管理更高效</h2>
      <p className="hero-copy">
        面向主办方与摊主的一体化运营平台，覆盖活动发布、报名管理与执行协同。
      </p>
      <div className="hero-actions">
        <Link href="/markets" className="button button-primary">
          查看招募活动
        </Link>
        <Link href="/organizer/markets" className="button button-secondary">
          进入主办方端
        </Link>
      </div>
    </section>
  );
}
```

```tsx
// apps/web/src/components/marketing/value-section.tsx
const values = [
  {
    title: "活动发布更集中",
    description: "主办方统一发布活动信息，减少招募渠道分散带来的沟通成本。"
  },
  {
    title: "报名流程更清晰",
    description: "摊主可以快速查看活动要求、进入报名流程并追踪结果。"
  },
  {
    title: "协同管理更省心",
    description: "从审核到执行的关键节点被统一管理，减少线下反复确认。"
  }
];

export function ValueSection() {
  return (
    <section
      className="value-section"
      aria-labelledby="value-title"
      role="region"
    >
      <h3 id="value-title">为什么使用这套平台</h3>
      <div className="value-grid">
        {values.map((value) => (
          <article key={value.title} className="info-card">
            <h4>{value.title}</h4>
            <p>{value.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// apps/web/src/components/marketing/flow-section.tsx
const steps = ["发布活动", "摊主报名", "审核沟通", "现场执行"];

export function FlowSection() {
  return (
    <section className="flow-section" aria-labelledby="flow-title" role="region">
      <h3 id="flow-title">核心流程</h3>
      <ol className="flow-list">
        {steps.map((step, index) => (
          <li key={step} className="flow-item">
            <span className="flow-index">0{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

```tsx
// apps/web/src/components/marketing/role-section.tsx
import Link from "next/link";

export function RoleSection() {
  return (
    <section className="role-section" aria-labelledby="role-title" role="region">
      <h3 id="role-title">选择你的使用路径</h3>
      <div className="role-grid">
        <article className="role-card">
          <h4>我是摊主</h4>
          <p>快速查看招募信息、选择合适市集并完成报名。</p>
          <Link href="/markets" className="button button-primary">
            去摊主端
          </Link>
        </article>
        <article className="role-card">
          <h4>我是主办方</h4>
          <p>统一发布活动、管理报名与跟进执行。</p>
          <Link href="/organizer/markets" className="button button-secondary">
            去主办方端
          </Link>
        </article>
      </div>
    </section>
  );
}
```

```tsx
// apps/web/src/components/marketing/cta-section.tsx
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="cta-section" aria-labelledby="cta-title" role="region">
      <h3 id="cta-title">现在开始建立更清晰的市集协作流程</h3>
      <div className="hero-actions">
        <Link href="/markets" className="button button-primary">
          查看招募活动
        </Link>
        <Link href="/organizer/markets" className="button button-secondary">
          进入主办方端
        </Link>
      </div>
      <p className="footer-note">市集活动摊主招募与运营管理平台</p>
    </section>
  );
}
```

- [ ] **Step 4: 运行测试，确认语义结构与现有断言同时通过**

Run: `pnpm --filter web test home-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/layout.tsx apps/web/src/app/globals.css apps/web/src/components/marketing apps/web/src/app/__tests__/home-page.test.tsx
git commit -m "feat: style homepage landing page sections"
```

### Task 4: 强化 AppShell 导航可读性并保持现有测试

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Modify: `apps/web/src/components/layout/__tests__/app-shell.test.tsx`
- Test: `apps/web/src/components/layout/__tests__/app-shell.test.tsx`

- [ ] **Step 1: 先调整测试，锁定导航语义和结构类名**

```tsx
// apps/web/src/components/layout/__tests__/app-shell.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "../app-shell";

describe("AppShell", () => {
  it("renders the product name and role navigation", () => {
    render(
      <AppShell>
        <main>content</main>
      </AppShell>
    );

    expect(screen.getByText("市集招募平台")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "角色导航" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "摊主端" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "主办方端" })).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认若结构不对会失败**

Run: `pnpm --filter web test app-shell.test.tsx`
Expected: PASS if existing semantics still match, or FAIL if the navigation structure needs to be updated before styling

- [ ] **Step 3: 写最小实现，让导航样式与首页一致**

```tsx
// apps/web/src/components/layout/app-shell.tsx
import Link from "next/link";
import type { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="shell-header" aria-label="主导航">
        <Link href="/" className="brand">
          市集招募平台
        </Link>
        <nav className="shell-nav" aria-label="角色导航">
          <Link href="/markets">摊主端</Link>
          <Link href="/organizer/markets">主办方端</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 运行壳测试和首页测试，确认没有回归**

Run: `pnpm --filter web test app-shell.test.tsx home-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/components/layout/app-shell.tsx apps/web/src/components/layout/__tests__/app-shell.test.tsx
git commit -m "feat: align app shell navigation with landing page"
```

### Task 5: 执行完整验证并整理首页交付

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`
- Test: `apps/web/src/components/layout/__tests__/app-shell.test.tsx`
- Test: `apps/web/src/app/__tests__/home-page.test.tsx`

- [ ] **Step 1: 运行全部相关测试**

Run: `pnpm --filter web test`
Expected: PASS with both `app-shell.test.tsx` and `home-page.test.tsx` green

- [ ] **Step 2: 运行构建验证**

Run: `pnpm --filter web build`
Expected: PASS with Next.js production build completing successfully

- [ ] **Step 3: 如构建暴露仅与首页相关的问题，做最小修正**

```tsx
// apps/web/src/app/page.tsx
import { CtaSection } from "../components/marketing/cta-section";
import { FlowSection } from "../components/marketing/flow-section";
import { HeroSection } from "../components/marketing/hero-section";
import { RoleSection } from "../components/marketing/role-section";
import { ValueSection } from "../components/marketing/value-section";
import { AppShell } from "../components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <main className="landing-page">
        <HeroSection />
        <ValueSection />
        <FlowSection />
        <RoleSection />
        <CtaSection />
      </main>
    </AppShell>
  );
}
```

```css
/* apps/web/src/app/globals.css */
.landing-page > * {
  scroll-margin-top: 96px;
}
```

- [ ] **Step 4: 重新运行测试和构建确认全部通过**

Run: `pnpm --filter web test && pnpm --filter web build`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/globals.css
git commit -m "feat: ship homepage landing page mvp"
```

## 自检

### Spec 覆盖

- `顶部导航`：Task 4
- `Hero 首屏`：Task 2
- `平台价值区`：Task 2
- `核心流程区`：Task 2
- `双角色入口区`：Task 2
- `底部 CTA 与页脚`：Task 2
- `样式策略`：Task 3
- `测试策略`：Task 1、Task 3、Task 4、Task 5

### Placeholder 扫描

- 本计划没有使用 `TBD`、`TODO`、`implement later`、`fill in details`
- 每个任务都包含具体文件、测试代码、命令和提交信息

### 类型一致性

- 首页组件统一使用 `HeroSection`、`ValueSection`、`FlowSection`、`RoleSection`、`CtaSection`
- 主按钮统一文案为 `查看招募活动`
- 主办方按钮统一文案为 `进入主办方端`
- 页面路径统一使用 `/markets` 和 `/organizer/markets`
