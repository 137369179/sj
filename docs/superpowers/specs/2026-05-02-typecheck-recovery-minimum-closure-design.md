# 类型检查恢复零错误最小闭环 Design

**目标**

- 将当前 `pnpm --filter web exec tsc --noEmit` 的真实报错恢复到零。
- 不引入新功能，只修正类型声明、测试夹具和少量显式类型缺失。

**上下文**

- 本轮身份链路收尾完成后，全量 `vitest` 已恢复通过。
- 当前阻塞最终验收的是一组独立于业务回归的 TypeScript 类型债。
- 报错集中在三类：
  - 页面测试夹具没有跟上新字段要求
  - service 层映射/事务回调缺少显式类型
  - 测试里的泛型断言写法与当前类型定义不兼容

**范围**

- 修正 `organizer-applications-page.test.tsx`
- 修正 `organizer-stalls-page.test.tsx`
- 修正 `vendor-applications-page.test.tsx`
- 修正 `dashboard route.test.ts` 的 metrics 夹具
- 修正 `applications/service.ts`、`stalls/service.ts`、`dashboard/service.ts`、`markets/service.ts` 中的显式类型
- 修正相关 service test 中的 transaction callback / `toMatchObject<T>` 类型写法

**非目标**

- 不改变业务行为。
- 不新增客户端交互。
- 不重构 Prisma 数据访问结构。

**设计决策**

1. 测试夹具对齐真实类型
   - `ApplicationReviewAuditRecord` 补 `applicationId`
   - `OrganizerApplicationListItem` / `VendorApplicationListItem` 补 `note`
   - 摊位页相关测试补 `attachments`、`reviews`、`reviewedAt`
   - dashboard route 测试补全新增 metrics 字段

2. 服务层显式类型补齐
   - 对 `map()` 回调参数、事务回调参数和结构解构参数补类型
   - 保持 service 对外接口不变

3. 旧测试泛型断言降噪
   - 把 `rejects.toMatchObject<T>()` 改成不带多余泛型的对象断言
   - 避免和当前 Vitest/TS 推断冲突

**测试策略**

- 先以 `tsc --noEmit` 作为红灯与绿灯主依据。
- 再跑全量 `vitest run`，确认类型修正没有影响现有行为。

**风险与回滚**

- 风险低，变更仅限类型层和测试夹具。
- 若某处类型补齐导致真实行为暴露不一致，应优先修正夹具或显式类型，而不是放宽生产类型边界。
