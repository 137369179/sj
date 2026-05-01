# Market Ecosystem Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a four-page static website prototype that explains the market platform's three-sided ecosystem and routes visitors from the homepage to vendor, organizer, and consumer scenario pages.

**Architecture:** Use a simple multi-page static site so the empty repository can ship a polished prototype quickly without framework setup. Keep shared styles and shared interaction logic in `assets/`, then compose each HTML page from the same visual language and navigation pattern.

**Tech Stack:** HTML, CSS, vanilla JavaScript, local static preview via Python `http.server`

---

## File Structure

### New Files

- `index.html` - Homepage with hero, three-sided overview, platform workflow, capability grid, strategy content, and CTA sections.
- `vendor.html` - Vendor scenario page focused on discovery, application, payment, and schedule support.
- `organizer.html` - Organizer scenario page focused on event publishing, review, booth allocation, settlement, and fulfillment.
- `consumer.html` - Consumer scenario page focused on discovery, reminders, and attendance conversion.
- `assets/styles.css` - Shared visual system, layout rules, section styles, buttons, cards, timeline blocks, CTA blocks, and responsive behavior.
- `assets/app.js` - Shared navigation helpers, current-page highlighting, smooth anchor scroll, and lightweight CTA interactions.

### Existing Files To Reference

- `README.md` - Project context.
- `.superpowers/brainstorm/2276-1777651451/content/mvp-boundary.html` - Existing three-sided MVP boundary source material.
- `docs/superpowers/specs/2026-05-01-market-ecosystem-website-design.md` - Approved design spec.

## Task 1: Create Shared Asset Structure

**Files:**
- Create: `assets/styles.css`
- Create: `assets/app.js`

- [ ] **Step 1: Create the shared stylesheet with design tokens and layout primitives**

```css
:root {
  --bg: #f6f4ee;
  --surface: #fffdf8;
  --surface-strong: #ffffff;
  --text: #1d1b16;
  --muted: #6b6558;
  --line: rgba(29, 27, 22, 0.12);
  --accent: #c96f3b;
  --accent-dark: #9d5228;
  --accent-soft: rgba(201, 111, 59, 0.14);
  --success: #2f6b4f;
  --radius-lg: 28px;
  --radius-md: 18px;
  --radius-sm: 12px;
  --shadow: 0 24px 80px rgba(34, 28, 20, 0.08);
  --max-width: 1180px;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: Inter, "Noto Sans SC", "PingFang SC", sans-serif;
  color: var(--text);
  background: linear-gradient(180deg, #f3efe5 0%, #f8f6f0 40%, #fcfbf7 100%);
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  display: block;
}

.container {
  width: min(var(--max-width), calc(100% - 40px));
  margin: 0 auto;
}

.section {
  padding: 88px 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-size: 14px;
  font-weight: 700;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 22px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
}

.button:hover {
  transform: translateY(-1px);
}

.button-primary {
  background: var(--accent);
  color: #fff;
}

.button-secondary {
  background: transparent;
  border-color: var(--line);
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(16px);
  background: rgba(248, 246, 240, 0.82);
  border-bottom: 1px solid rgba(29, 27, 22, 0.06);
}

.site-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 76px;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.nav-link {
  padding: 10px 14px;
  border-radius: 999px;
  color: var(--muted);
}

.nav-link.is-active,
.nav-link:hover {
  background: rgba(255, 255, 255, 0.8);
  color: var(--text);
}

.hero {
  padding: 72px 0 56px;
}

.hero-grid,
.split-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 28px;
  align-items: stretch;
}

.panel,
.card,
.timeline-step,
.stat,
.cta-panel {
  background: var(--surface-strong);
  border: 1px solid rgba(29, 27, 22, 0.08);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.panel {
  padding: 34px;
}

.hero h1,
.page-hero h1 {
  margin: 18px 0 18px;
  font-size: clamp(40px, 6vw, 72px);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.lead {
  font-size: 18px;
  line-height: 1.7;
  color: var(--muted);
  max-width: 62ch;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.card {
  padding: 24px;
}

.card h3,
.section h2,
.timeline-step h3,
.cta-panel h3 {
  margin: 0 0 12px;
}

.muted {
  color: var(--muted);
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.stat {
  padding: 22px;
}

.stat strong {
  display: block;
  font-size: 30px;
  margin-bottom: 8px;
}

.timeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.timeline-step {
  padding: 24px;
}

.bullet-list {
  display: grid;
  gap: 12px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.bullet-list li {
  display: flex;
  gap: 12px;
  line-height: 1.7;
  color: var(--muted);
}

.bullet-list li::before {
  content: "";
  width: 10px;
  height: 10px;
  margin-top: 10px;
  border-radius: 999px;
  background: var(--accent);
  flex: 0 0 auto;
}

.page-hero {
  padding: 64px 0 28px;
}

.feature-stack {
  display: grid;
  gap: 18px;
}

.feature-block {
  padding: 28px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(29, 27, 22, 0.08);
  border-radius: var(--radius-md);
}

.cta-panel {
  padding: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.site-footer {
  padding: 32px 0 56px;
  color: var(--muted);
}

@media (max-width: 960px) {
  .hero-grid,
  .split-grid,
  .card-grid,
  .timeline,
  .kpi-row {
    grid-template-columns: 1fr;
  }

  .site-nav {
    align-items: flex-start;
    flex-direction: column;
    padding: 16px 0;
  }

  .cta-panel {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

- [ ] **Step 2: Create the shared script for current-page state and CTA behavior**

```js
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll("[data-nav]");

  navLinks.forEach((link) => {
    const target = link.getAttribute("href");
    if (!target) return;

    if (target === currentPath || (currentPath === "" && target === "index.html")) {
      link.classList.add("is-active");
    }
  });

  const ctaButtons = document.querySelectorAll("[data-cta-label]");
  ctaButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const label = button.getAttribute("data-cta-label");
      const status = document.querySelector("[data-cta-status]");
      if (!status || !label) return;
      status.textContent = `已选择：${label}，下一阶段可接入真实表单或咨询入口。`;
    });
  });
});
```

- [ ] **Step 3: Verify shared files exist**

Run: `ls /workspace/assets`
Expected: output includes `app.js` and `styles.css`

- [ ] **Step 4: Commit shared asset foundation**

```bash
git add assets/styles.css assets/app.js
git commit -m "feat: add shared website assets"
```

## Task 2: Build The Homepage

**Files:**
- Create: `index.html`
- Modify: `assets/styles.css`
- Modify: `assets/app.js`

- [ ] **Step 1: Create the homepage shell with shared header and hero**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>市集三端生态平台</title>
    <meta
      name="description"
      content="面向摊主、主办方与消费者的市集生态平台官网雏形，展示活动招募、运营协同与到场转化。"
    />
    <link rel="stylesheet" href="./assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="container site-nav">
        <a class="brand" href="./index.html">Market Together</a>
        <nav class="nav-links">
          <a class="nav-link" data-nav href="./index.html">首页</a>
          <a class="nav-link" data-nav href="./vendor.html">摊主端</a>
          <a class="nav-link" data-nav href="./organizer.html">主办方端</a>
          <a class="nav-link" data-nav href="./consumer.html">消费者端</a>
        </nav>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="container hero-grid">
          <div class="panel">
            <div class="eyebrow">三端生态官网雏形</div>
            <h1>把市集的招募、组织与到场体验连成一条清晰主线</h1>
            <p class="lead">
              面向摊主、主办方与消费者，统一展示活动发现、报名审核、摊位分配、支付结算和到场转化，让一场市集从筹备到落地更高效、更透明。
            </p>
            <div class="action-row">
              <a class="button button-primary" href="#ecosystem">查看三端价值</a>
              <a class="button button-secondary" href="#capabilities">浏览核心能力</a>
            </div>
            <div class="kpi-row">
              <div class="stat">
                <strong>3</strong>
                <span class="muted">统一服务对象</span>
              </div>
              <div class="stat">
                <strong>4</strong>
                <span class="muted">首期官网页面</span>
              </div>
              <div class="stat">
                <strong>1</strong>
                <span class="muted">清晰的平台主叙事</span>
              </div>
            </div>
          </div>
          <div class="panel">
            <h2>平台解决什么问题</h2>
            <ul class="bullet-list">
              <li>摊主不知道去哪找适合自己的活动，报名信息也容易碎片化。</li>
              <li>主办方需要在招募、筛选、摊位配置和结算之间来回切换。</li>
              <li>消费者能看到活动，但难以持续被提醒和引导到场。</li>
            </ul>
          </div>
        </div>
      </section>
    </main>

    <script src="./assets/app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Expand the homepage with ecosystem, workflow, capability, strategy, and CTA sections**

```html
<section id="ecosystem" class="section">
  <div class="container">
    <div class="eyebrow">三端价值</div>
    <h2>同一平台，服务三种关键角色</h2>
    <div class="card-grid">
      <article class="card">
        <h3>摊主端</h3>
        <p class="muted">更快找到活动、完成报名与支付，并持续管理档期与经营节奏。</p>
        <a class="button button-secondary" href="./vendor.html">查看摊主端</a>
      </article>
      <article class="card">
        <h3>主办方端</h3>
        <p class="muted">更高效发布活动、审核摊主、配置摊位、跟踪订单与履约。</p>
        <a class="button button-secondary" href="./organizer.html">查看主办方端</a>
      </article>
      <article class="card">
        <h3>消费者端</h3>
        <p class="muted">更轻松发现活动、收藏提醒并完成到场参与。</p>
        <a class="button button-secondary" href="./consumer.html">查看消费者端</a>
      </article>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="eyebrow">平台流程</div>
    <h2>从活动发布到现场到场，形成一条完整链路</h2>
    <div class="timeline">
      <article class="timeline-step">
        <h3>01 发布与发现</h3>
        <p class="muted">主办方创建活动，摊主与消费者通过平台发现合适的市集。</p>
      </article>
      <article class="timeline-step">
        <h3>02 报名与审核</h3>
        <p class="muted">摊主提交资料和申请，主办方基于规则与人工复核完成筛选。</p>
      </article>
      <article class="timeline-step">
        <h3>03 分配与结算</h3>
        <p class="muted">平台辅助摊位配置、费用确认、退款与结算台账整理。</p>
      </article>
      <article class="timeline-step">
        <h3>04 提醒与到场</h3>
        <p class="muted">消费者收到提醒与内容种草，最终转化为到场参与。</p>
      </article>
    </div>
  </div>
</section>

<section id="capabilities" class="section">
  <div class="container">
    <div class="eyebrow">核心能力</div>
    <h2>官网不仅讲概念，也讲平台如何真正工作</h2>
    <div class="card-grid">
      <article class="card">
        <h3>招募与筛选</h3>
        <p class="muted">围绕活动发布、报名资料、资质复核和规则化审核建立清晰流程。</p>
      </article>
      <article class="card">
        <h3>支付与结算</h3>
        <p class="muted">让报名费、摊位费、退款与结算台账具备统一视图和透明说明。</p>
      </article>
      <article class="card">
        <h3>内容与通知</h3>
        <p class="muted">通过详情展示、消息提醒和到场通知连接筹备期与活动期。</p>
      </article>
    </div>
  </div>
</section>

<section class="section">
  <div class="container split-grid">
    <div class="panel">
      <div class="eyebrow">策略能力</div>
      <h2>把提示词方法论变成平台体验设计能力</h2>
      <ul class="bullet-list">
        <li>微文案优化：统一错误提示、空状态和关键操作表达。</li>
        <li>引导流程设计：优化新手引导、路径转化和核心功能认知。</li>
        <li>用户研究支持：沉淀真实抱怨、访谈线索和决策顾虑。</li>
        <li>页面方案生成：把业务场景快速转成结构化页面内容方案。</li>
      </ul>
    </div>
    <div class="panel">
      <div class="eyebrow">平台原则</div>
      <h2>先跑通主流程，再逐步增强深度</h2>
      <p class="lead">
        首期聚焦活动发现、招募审核、支付结算与到场转化，不把复杂经营系统或重电商逻辑提前塞进 MVP 主路径。
      </p>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="cta-panel">
      <div>
        <div class="eyebrow">继续深入</div>
        <h3>选择你最关心的一端，查看对应场景页</h3>
        <p class="muted" data-cta-status>可以先浏览三端场景，再决定下一阶段优先做哪一端。</p>
      </div>
      <div class="action-row">
        <a class="button button-primary" data-cta-label="摊主端优先" href="./vendor.html">摊主端</a>
        <a class="button button-secondary" data-cta-label="主办方端优先" href="./organizer.html">主办方端</a>
        <a class="button button-secondary" data-cta-label="消费者端优先" href="./consumer.html">消费者端</a>
      </div>
    </div>
  </div>
</section>

<footer class="site-footer">
  <div class="container">官网雏形用于展示三端生态逻辑与页面方向，后续可继续接入真实品牌内容与业务入口。</div>
</footer>
```

- [ ] **Step 3: Run a local preview server and confirm the homepage responds**

Run: `cd /workspace && python3 -m http.server 4173`
Expected: terminal prints `Serving HTTP on 0.0.0.0 port 4173`

- [ ] **Step 4: Open `http://localhost:4173/index.html` and manually verify homepage sections**

Expected:
- sticky header renders
- hero copy is visible
- ecosystem cards link to scenario pages
- CTA block updates status text when clicked

- [ ] **Step 5: Commit the homepage**

```bash
git add index.html assets/styles.css assets/app.js
git commit -m "feat: add ecosystem homepage"
```

## Task 3: Build The Vendor Scenario Page

**Files:**
- Create: `vendor.html`
- Modify: `assets/styles.css`

- [ ] **Step 1: Create the vendor page scaffold**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>摊主端场景页</title>
    <link rel="stylesheet" href="./assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="container site-nav">
        <a class="brand" href="./index.html">Market Together</a>
        <nav class="nav-links">
          <a class="nav-link" data-nav href="./index.html">首页</a>
          <a class="nav-link" data-nav href="./vendor.html">摊主端</a>
          <a class="nav-link" data-nav href="./organizer.html">主办方端</a>
          <a class="nav-link" data-nav href="./consumer.html">消费者端</a>
        </nav>
      </div>
    </header>
    <main class="page-hero">
      <div class="container split-grid">
        <div class="panel">
          <div class="eyebrow">摊主端</div>
          <h1>更快找到合适市集，更顺畅完成报名与确认</h1>
          <p class="lead">
            摊主端聚焦发现、报名、支付、确认四个关键动作，不把复杂经营工具提前做成主路径阻塞项。
          </p>
        </div>
        <div class="panel">
          <h2>核心收益</h2>
          <ul class="bullet-list">
            <li>快速筛选适合自己品类和档期的活动。</li>
            <li>清楚看到费用、资料要求与进度状态。</li>
            <li>在同一页面里完成报名、上传与支付确认。</li>
          </ul>
        </div>
      </div>
    </main>
    <script src="./assets/app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Add vendor-specific flow, capability, pain point, and CTA sections**

```html
<section class="section">
  <div class="container">
    <div class="eyebrow">使用流程</div>
    <div class="timeline">
      <article class="timeline-step"><h3>01 发现活动</h3><p class="muted">通过搜索、筛选和推荐找到匹配的市集。</p></article>
      <article class="timeline-step"><h3>02 查看详情</h3><p class="muted">明确费用、时间、摊位信息和资料要求。</p></article>
      <article class="timeline-step"><h3>03 提交报名</h3><p class="muted">上传资质、品牌资料和报名信息，等待审核。</p></article>
      <article class="timeline-step"><h3>04 支付确认</h3><p class="muted">完成费用支付，接收进度与到场通知。</p></article>
    </div>
  </div>
</section>

<section class="section">
  <div class="container feature-stack">
    <article class="feature-block">
      <h3>关键能力</h3>
      <p class="muted">活动发现、费用透明、报名上传、消息通知、档期管理和基础经营辅助。</p>
    </article>
    <article class="feature-block">
      <h3>典型痛点</h3>
      <p class="muted">信息分散、费用不透明、报名进度不清楚、重复沟通成本高。</p>
    </article>
    <article class="feature-block">
      <h3>平台改进点</h3>
      <p class="muted">通过统一详情页、进度状态和支付确认，让摊主更快做出报名决策。</p>
    </article>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="cta-panel">
      <div>
        <div class="eyebrow">下一步</div>
        <h3>如果你更关注活动获取效率，这一页就是首期核心方向</h3>
        <p class="muted" data-cta-status>下一阶段可继续接入报名表单、档期管理与消息中心。</p>
      </div>
      <a class="button button-primary" data-cta-label="摊主端继续深化" href="./index.html">返回首页继续比较</a>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Manually verify `vendor.html` in the browser**

Expected:
- vendor nav item is highlighted
- page hero explains vendor value
- four-step flow appears in order
- CTA block renders correctly on desktop and mobile widths

- [ ] **Step 4: Commit the vendor page**

```bash
git add vendor.html assets/styles.css
git commit -m "feat: add vendor scenario page"
```

## Task 4: Build The Organizer And Consumer Scenario Pages

**Files:**
- Create: `organizer.html`
- Create: `consumer.html`
- Modify: `assets/styles.css`

- [ ] **Step 1: Create `organizer.html` using the shared shell**

```html
<main class="page-hero">
  <div class="container split-grid">
    <div class="panel">
      <div class="eyebrow">主办方端</div>
      <h1>让活动发布、审核分配与结算协同回到一条主线上</h1>
      <p class="lead">主办方端聚焦发布、审核、分配、结算和履约，不用一开始就引入复杂黑盒系统。</p>
    </div>
    <div class="panel">
      <h2>核心收益</h2>
      <ul class="bullet-list">
        <li>集中管理招募、审核和摊位配置。</li>
        <li>通过规则式流程减少重复人工操作。</li>
        <li>让订单、退款和结算台账更加透明。</li>
      </ul>
    </div>
  </div>
</main>

<section class="section">
  <div class="container timeline">
    <article class="timeline-step"><h3>01 创建活动</h3><p class="muted">发布活动页面并设置报名条件。</p></article>
    <article class="timeline-step"><h3>02 审核摊主</h3><p class="muted">结合资料复核与规则判断完成筛选。</p></article>
    <article class="timeline-step"><h3>03 配置摊位</h3><p class="muted">进行基础地图配置与摊位分配。</p></article>
    <article class="timeline-step"><h3>04 结算履约</h3><p class="muted">管理订单、退款、结算和活动执行通知。</p></article>
  </div>
</section>
```

- [ ] **Step 2: Create `consumer.html` using the shared shell**

```html
<main class="page-hero">
  <div class="container split-grid">
    <div class="panel">
      <div class="eyebrow">消费者端</div>
      <h1>让用户更容易发现值得去的市集，并被持续提醒到场</h1>
      <p class="lead">消费者端首期承担引流、种草和提醒，不把它做成另一套重电商系统。</p>
    </div>
    <div class="panel">
      <h2>核心收益</h2>
      <ul class="bullet-list">
        <li>更快发现周边活动与亮点内容。</li>
        <li>在到场前完成收藏、提醒和计划安排。</li>
        <li>活动信息与摊主预览更清晰，减少犹豫。</li>
      </ul>
    </div>
  </div>
</main>

<section class="section">
  <div class="container timeline">
    <article class="timeline-step"><h3>01 发现活动</h3><p class="muted">按地点、时间和主题浏览近期市集。</p></article>
    <article class="timeline-step"><h3>02 浏览亮点</h3><p class="muted">查看活动介绍和摊主预览，形成兴趣。</p></article>
    <article class="timeline-step"><h3>03 收藏提醒</h3><p class="muted">收藏活动并接收开场提醒。</p></article>
    <article class="timeline-step"><h3>04 到场参与</h3><p class="muted">按计划到场，完成线下参与与二次传播。</p></article>
  </div>
</section>
```

- [ ] **Step 3: Add parallel feature, pain point, and CTA blocks to both pages**

```html
<!-- organizer.html -->
<section class="section">
  <div class="container feature-stack">
    <article class="feature-block">
      <h3>关键能力</h3>
      <p class="muted">活动发布、资质审核、摊位配置、规则式分配、订单退款与结算台账。</p>
    </article>
    <article class="feature-block">
      <h3>典型痛点</h3>
      <p class="muted">招募入口分散、审核标准不统一、摊位分配反复沟通、结算记录难沉淀。</p>
    </article>
    <article class="feature-block">
      <h3>平台改进点</h3>
      <p class="muted">通过统一活动后台和规则式流程，减少主办方在招募和履约过程中的切换成本。</p>
    </article>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="cta-panel">
      <div>
        <div class="eyebrow">下一步</div>
        <h3>如果你更关注办活动效率，这一页就是最值得继续深化的方向</h3>
        <p class="muted" data-cta-status>下一阶段可继续接入审核流、摊位配置和结算明细页面。</p>
      </div>
      <a class="button button-primary" data-cta-label="主办方端继续深化" href="./index.html">返回首页继续比较</a>
    </div>
  </div>
</section>

<!-- consumer.html -->
<section class="section">
  <div class="container feature-stack">
    <article class="feature-block">
      <h3>关键能力</h3>
      <p class="muted">活动发现、亮点内容预览、收藏提醒、活动日历和轻量互动入口。</p>
    </article>
    <article class="feature-block">
      <h3>典型痛点</h3>
      <p class="muted">活动分散、信息可信度不高、看到后容易忘记、缺少到场前的内容引导。</p>
    </article>
    <article class="feature-block">
      <h3>平台改进点</h3>
      <p class="muted">通过统一的活动详情、摊主预览和提醒机制，把兴趣更稳定地转化为到场。</p>
    </article>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="cta-panel">
      <div>
        <div class="eyebrow">下一步</div>
        <h3>如果你更看重引流和种草，这一页代表消费者端首期价值</h3>
        <p class="muted" data-cta-status>下一阶段可继续接入提醒订阅、专题推荐和到场互动设计。</p>
      </div>
      <a class="button button-primary" data-cta-label="消费者端继续深化" href="./index.html">返回首页继续比较</a>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Manually verify both pages**

Expected:
- `organizer.html` and `consumer.html` load without missing styles
- page copy matches the intended user role
- navigation works across all four pages

- [ ] **Step 5: Commit both scenario pages**

```bash
git add organizer.html consumer.html assets/styles.css
git commit -m "feat: add organizer and consumer scenario pages"
```

## Task 5: Polish Shared Navigation And Responsive Details

**Files:**
- Modify: `assets/styles.css`
- Modify: `assets/app.js`
- Modify: `index.html`
- Modify: `vendor.html`
- Modify: `organizer.html`
- Modify: `consumer.html`

- [ ] **Step 1: Add a reusable page sub-navigation pattern where needed**

```html
<div class="action-row">
  <a class="button button-secondary" href="./index.html">返回首页</a>
  <a class="button button-secondary" href="./organizer.html">查看主办方端</a>
  <a class="button button-secondary" href="./consumer.html">查看消费者端</a>
</div>
```

- [ ] **Step 2: Improve mobile spacing and text hierarchy in the stylesheet**

```css
@media (max-width: 640px) {
  .container {
    width: min(100% - 24px, var(--max-width));
  }

  .hero {
    padding-top: 40px;
  }

  .panel,
  .card,
  .timeline-step,
  .feature-block,
  .cta-panel {
    padding: 22px;
    border-radius: 20px;
  }

  .hero h1,
  .page-hero h1 {
    font-size: 38px;
  }
}
```

- [ ] **Step 3: Add a menu-state helper only if mobile nav wrapping feels crowded**

```js
const header = document.querySelector(".site-header");
if (header && window.innerWidth < 640) {
  header.classList.add("is-compact");
}
```

- [ ] **Step 4: Verify responsive behavior at two widths**

Run manual checks at:
- 1280px wide viewport
- 390px wide viewport

Expected:
- nav remains readable
- CTA buttons wrap cleanly
- no card or panel content overflows horizontally

- [ ] **Step 5: Commit responsive polish**

```bash
git add assets/styles.css assets/app.js index.html vendor.html organizer.html consumer.html
git commit -m "feat: polish responsive website prototype"
```

## Task 6: Final Preview And Handoff

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append a short local preview section to `README.md`**

```md
## 本地预览

    cd /workspace
    python3 -m http.server 4173

打开 `http://localhost:4173/index.html` 预览官网首页，并通过导航访问三端场景页。
```

- [ ] **Step 2: Run the local preview command one more time**

Run: `cd /workspace && python3 -m http.server 4173`
Expected: terminal prints `Serving HTTP on 0.0.0.0 port 4173`

- [ ] **Step 3: Click through all four pages and confirm final acceptance**

Expected:
- homepage presents the full platform story
- three scenario pages each have distinct role-specific copy
- all buttons and links behave as intended
- no broken layout appears in the browser

- [ ] **Step 4: Commit documentation and handoff**

```bash
git add README.md
git commit -m "docs: add local preview instructions"
```

## Self-Review Checklist

- Spec coverage: homepage, vendor page, organizer page, consumer page, shared styling, lightweight interaction, and local preview are all covered by Tasks 1 through 6.
- Placeholder scan: all output files, commands, and verification steps are spelled out; no `TODO` or `TBD` text remains in the plan.
- Type consistency: shared files stay `assets/styles.css` and `assets/app.js`; page names stay `index.html`, `vendor.html`, `organizer.html`, and `consumer.html` throughout the plan.
