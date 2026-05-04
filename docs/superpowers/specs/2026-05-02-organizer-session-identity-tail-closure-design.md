# 主办方身份链路收尾与 MVP Backlog 同步 Design

**目标**

- 收掉主办方身份链路里仍残留的 query/body 身份注入方式。
- 让看板 API 与摊位分配 API 和现有页面 Server Action 一样，统一以 session userId 作为主办方身份来源。
- 同步更新 MVP backlog 与验收文档，去掉已经被代码实现追平的陈旧待办。

**上下文**

- 现有主办方页面层已普遍切到 `getSessionUser()`，并使用 `sessionUser.userId` 调服务层。
- 但 `GET /api/dashboard/markets/[marketId]` 仍要求 `?organizerId=`，`POST /api/stalls/[stallId]/assign` 仍信任 body 中的 `organizerId`。
- 这让 API 与页面入口的权限模型出现分叉，也让文档仍停留在“query 参数身份上下文尚未升级”的旧状态。

**范围**

- 将 dashboard API 从 `getSessionRole()` 切到 `getSessionUser()`。
- 移除 dashboard API 对 `organizerId` query 参数的依赖。
- 将摊位分配 API 从 `getSessionRole()` 切到 `getSessionUser()`。
- 让摊位分配 API 覆盖请求体中的 `organizerId`，始终以 session userId 调用服务层。
- 更新相关 API 测试。
- 更新 MVP backlog/acceptance 文档中的陈旧项。

**非目标**

- 不修改 dashboard service 与 stalls service 的内部业务规则。
- 不重构登录 stub。
- 不处理 vendor 侧剩余体验增强。
- 不在本轮实现摊位分配事务化。

**方案对比**

1. 推荐：API 与页面统一改为 `getSessionUser()` 注入主办方 userId
   - 优点：身份模型一致；最符合现有页面实现；能直接收掉 query/body 注入风险。
   - 缺点：需要同步更新 API 测试与少量文档。

2. 备选：保留 API 的 `getSessionRole()`，只在测试与文档里注明 query/body 仍允许传身份
   - 优点：改动小。
   - 缺点：会继续保留页面和 API 的安全模型分叉，不适合作为下一阶段基线。

3. 备选：把 service 层改成完全自行读 session
   - 优点：调用方更薄。
   - 缺点：会污染 service 层纯业务边界，超出本轮最小闭环。

**设计决策**

1. Dashboard API
   - `GET /api/dashboard/markets/[marketId]` 改用 `getSessionUser()`。
   - 权限判定：
     - 未登录或非 `organizer/admin` -> `403`
   - 调服务层时直接传：
     - `organizerId: sessionUser.userId`
     - `marketId`
   - 不再读取 `searchParams.organizerId`，也不再返回 `400 organizerId is required`。

2. Stall Assign API
   - `POST /api/stalls/[stallId]/assign` 改用 `getSessionUser()`。
   - 继续复用 `buildAssignStallPayload(body)` 做结构校验，但在调用 `assignStall()` 时覆写：
     - `organizerId: sessionUser.userId`
   - 即使请求体带了其他 `organizerId`，也必须被 session 身份接管。

3. 文档同步
   - `docs/TODO_市集招募平台_MVP.md`
     - 移除或下调已经完成的：
       - 报名页完整 UI 闭环
       - Prisma 正式迁移
       - query 参数升级为 session
       - 报名备注与审核备注拆分
       - 审核记录持久化
       - 主办方页面体验增强
   - `docs/ACCEPTANCE_市集招募平台_MVP.md`
     - 把“仍通过 query 参数模拟身份上下文”等过时描述改为当前真实状态。

**测试策略**

- 更新 `apps/web/src/app/api/dashboard/markets/[marketId]/route.test.ts`
  - 覆盖 dashboard API 不再依赖 query 中的 `organizerId`
  - 覆盖调用 service 时使用 session userId
- 更新 `apps/web/src/app/api/stalls/[stallId]/assign/route.test.ts`
  - 覆盖即使 body 带其他 `organizerId`，也会被 session userId 覆写
  - 保持非 organizer/admin 仍返回 `403`

**风险与回滚**

- 风险低，改动局限在 API 入口和文档层。
- 若后续登录模型变化，只需继续保证 `getSessionUser()` 的 userId 语义稳定，不影响服务层边界。
