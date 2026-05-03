# 类型检查恢复零错误最小闭环后续事项

## 当前未覆盖

- 仍有部分测试依赖 Prisma 返回类型的双重断言，这属于测试夹具兼容写法，不是业务问题
- Vite 的 CJS Node API 弃用提示仍存在，但不影响当前测试通过

## 后续可选增强

- 抽离更稳定的测试夹具构造器，减少每次领域模型扩展时的大面积测试同步成本
- 统一 service tests 的 Prisma mock builder，降低 `as unknown as` 的使用频率
- 后续可单独处理 Vite/Vitest 相关依赖升级，消除弃用提示

## 环境备注

- 如重新安装依赖后测试无法启动，需要先执行：
  - `pnpm --filter web exec prisma generate`
- 当前 `pnpm --filter web exec vitest run` 通过
- 当前 `pnpm --filter web exec tsc --noEmit` 通过
