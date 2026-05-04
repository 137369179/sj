# 主办方身份链路收尾验收记录

## 验收范围

- dashboard API 不再依赖 query `organizerId`
- stalls assign API 不再信任 body `organizerId`
- 主办方关键 API 与页面统一以 session userId 作为身份来源
- MVP backlog 与 acceptance 文档同步到当前实现状态

## 验收结果

- `apps/web/src/app/api/dashboard/markets/[marketId]/route.ts`
  - 已从 `getSessionRole()` 切到 `getSessionUser()`
  - 已移除 `organizerId is required` 的 query 参数依赖
  - 已使用 `sessionUser.userId` 调用 `getMarketDashboardSummary()`
- `apps/web/src/app/api/stalls/[stallId]/assign/route.ts`
  - 已从 `getSessionRole()` 切到 `getSessionUser()`
  - 已在 route 层用 `sessionUser.userId` 覆写 `organizerId`
- `docs/TODO_市集招募平台_MVP.md`
  - 已移除或下调陈旧项，如 query 身份上下文升级、报名页闭环、migration、审核记录持久化等
- `docs/ACCEPTANCE_市集招募平台_MVP.md`
  - 已改为描述当前真实状态：最小 session stub 已接入，关键页面与 API 已使用 session userId

## 测试记录

- 聚焦 API 回归通过：
  - `pnpm --filter web exec vitest run src/app/api/dashboard/markets/[marketId]/route.test.ts src/app/api/stalls/[stallId]/assign/route.test.ts`
- 全量测试通过：
  - `pnpm --filter web exec vitest run`
- 类型检查通过：
  - `pnpm --filter web exec tsc --noEmit`

## 验收结论

- 主办方身份链路收尾完成。
- 页面与关键 API 的身份来源模型已对齐。
- MVP backlog 文档已从“历史待办清单”收敛为“当前真实剩余工作清单”。
