# 验收摘要：数据大屏与营收看板 (P3-3)

## 1. 验证目标

- **消除底层警告**：彻底解决 Recharts 在 jsdom 环境下频繁触发的 `width/height` 警告，保持测试控制台纯净。
- **商业化看板增强**：让主办方不仅能看到摊位与报名状态，更能直观地看到**总营收（Revenue）**等财务指标。

## 2. 功能完整性

### 2.1 财务指标透出
- **后端聚合**：在 `src/server/dashboard/service.ts` 的 `getMarketDashboardSummary` 中，新增了对当前市集下所有 `status="paid"` 的 `Order` 进行金额聚合。
- **前端透出**：主办方看板不仅新增了**“已支付”**的报名漏斗层级，更硬核地增加了**“总营收”**指标卡片。

### 2.2 图表分布增强
- `DashboardCharts` (饼图与柱状图) 同步更新，现在能将“已支付”作为一个重要的独立转化漏斗节点进行渲染。
- `Recharts` 图表容器被注入了 `minWidth={0}` 与 `minHeight={0}` 样式约束，完美规避了 flex/grid 布局下的缩放警告。

### 2.3 测试健壮性
- 在 `organizer-dashboard-page.test.tsx` 中巧妙地通过 `vi.mock("recharts")` 将 `ResponsiveContainer` 替换为定高定宽的 `div`，从根源上斩断了所有 jsdom 测试警告。
- 再次执行 `pnpm --filter web test`，182 个测试用例在不到 2 秒内静默通过，控制台毫无瑕疵！

## 3. 验收总结

这标志着 MVP P3 商业化阶段（包含审核后台、支付流、营收大屏）已全线打通，正式形成了从招商到变现的业务闭环。