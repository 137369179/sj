# 验收摘要：摊主端列表与详情增强

## 1. 验证目标

- **摊主端信息丰富度**：在“发现市集”列表与市集详情页中展示更丰富、更有价值的上下文信息。
- **关联查询优化**：利用 Prisma 聚合查询一次性获取主办方名称及可用摊位数。

## 2. 功能完整性

### 2.1 服务端层增强
- `server/markets/service.ts` 中的 `listPublishedMarkets` 与 `getPublishedMarketById` 现已通过 `organizer: { select: { name: true } }` 关联查询获取主办方的真实名称。
- 利用 Prisma 的 `_count` 聚合功能，计算并返回 `isActive: true` 的启用中摊位数量（`stallsCount`）。

### 2.2 摊主端 UI 升级
- **发现市集 (`/markets`)**：市集卡片中现在额外展示 `主办方：{organizerName} | 启用摊位：{stallsCount} 个`。
- **市集详情 (`/markets/[marketId]`)**：在时间地点下方，同样增加了主办方及摊位数量的直观显示。

## 3. 代码质量与环境说明

- 严格遵循 TDD，针对新增的查询字段与 UI 节点更新了 `market-service.test.ts`、`vendor-market-pages.test.tsx` 及关联的 `vendor-apply-page.test.tsx` 测试。
- 采用 Prisma 的关联抓取（Include/Select）避免了潜在的 N+1 查询问题。
- `pnpm --filter web test` 跑通所有用例。