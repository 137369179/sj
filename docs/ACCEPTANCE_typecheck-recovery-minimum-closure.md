# 类型检查恢复零错误最小闭环验收记录

## 验收范围

- 修复当前真实存在的 TypeScript 报错
- 让测试夹具与现有领域类型保持一致
- 恢复 `tsc --noEmit` 与全量测试的双绿状态

## 验收结果

- 页面测试夹具已补齐：
  - `note`
  - `applicationId`
  - `attachments / reviews / reviewedAt`
  - dashboard metrics 新增字段
- API route 测试已对齐当前真实返回结构，避免因领域模型扩展而继续使用过窄预期
- service tests 中的 Prisma mock 夹具已改为更兼容当前返回结构的类型断言
- 旧的 `rejects.toMatchObject<T>()` 泛型断言已切到兼容当前 Vitest/TS 的写法

## 验证记录

- 类型检查通过：
  - `pnpm --filter web exec tsc --noEmit`
- 全量测试通过：
  - `pnpm --filter web exec vitest run`

## 验收结论

- 当前工作区已恢复零类型错误
- 当前全量测试为 `29` 个测试文件、`115` 个测试全部通过
