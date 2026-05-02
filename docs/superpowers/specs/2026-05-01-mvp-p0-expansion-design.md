# MVP P0 扩展设计

## 背景

当前 `市集招募平台` 已完成 MVP 招募闭环的基础版本，已经具备：

- 主办方发布市集
- 摊主浏览市集
- 报名 API 与基础后端校验
- 主办方审核与通知
- 摊位分配
- 摊主查看结果
- 主办方基础看板

现阶段的主要缺口不在“有没有闭环”，而在“闭环是否可持续扩展并接近真实使用”：

- 报名页前端闭环未完整接通
- Prisma schema 已演进，但 migration 未正式补齐
- 用户上下文仍部分依赖 query 参数
- 报名备注与审核备注语义混杂

因此本轮 P0 扩展的目标，是在不推翻当前 MVP 的前提下，把这四块能力一次收口成新的可持续基线。

## 目标

本轮同时完成以下 4 项 P0：

1. 报名页完整前端闭环
2. Prisma 正式迁移
3. session userId 接入
4. 报名备注与审核备注拆分

完成后应达到：

- 摊主可以从市集详情页进入报名页并完成提交
- API 不再依赖 `vendorId` / `organizerId` query 参数作为主身份来源
- 数据模型支持报名备注与审核备注分离
- 新 schema 有正式 migration，可在开发环境回放

## 非目标

本轮不包含以下内容：

- 完整注册登录系统
- 支付、结算、订单
- 真实文件上传到对象存储的完整流程
- 审核历史独立表的完整产品化
- 消费者端扩展
- 平台后台增强

## 实施策略

虽然用户要求四项 P0 同一轮完成，但实现上不采用无序并行，而采用“一个目标、四条子流、按依赖推进”的方式：

1. 先收敛数据模型
2. 再补 migration
3. 再重构服务与 API 契约
4. 再接入 session userId
5. 最后补报名页完整前端闭环

原因：

- 前端报名页依赖稳定的数据契约
- session userId 改造会影响 API 入参
- 备注拆分会影响报名页、审核页、通知页和摊主页
- migration 应先于依赖新字段的功能长期沉淀

## 数据模型设计

### Application 调整

当前 `Application` 使用 `note` 字段同时承载报名说明与后续备注，语义冲突明显。本轮改为：

- 新增 `applicationNote`
- 新增 `reviewNote`
- 新增 `boothPreference`
- 新增 `attachmentsJson`
- 保留旧 `note` 字段一轮，用作兼容过渡

### 字段职责

- `applicationNote`：摊主提交报名时填写的经营说明或补充备注
- `reviewNote`：主办方审核时填写的审核备注
- `boothPreference`：摊主报名时提交的摊位偏好
- `attachmentsJson`：附件元数据 JSON，先承载文件 URL 和原始文件名
- `note`：兼容字段，不再作为新逻辑主读写字段

### 设计原因

- 采用增量兼容迁移，不做破坏式删除
- 避免这轮同时引入复杂附件关系表
- 保持当前服务层改造成本可控

## Migration 策略

本轮新增正式 migration，要求：

- 能把 `Application` 新字段落到数据库
- 不删除旧字段
- 能在开发环境回放
- 生成后的 Prisma Client 与代码一致

迁移顺序：

1. 修改 `schema.prisma`
2. 生成 migration
3. 回放 migration
4. 重新生成 Prisma Client
5. 执行依赖新字段的测试

## session userId 设计

### 登录接口升级

当前登录只写入 `role`，本轮升级为同时写入：

- `userId`
- `role`

cookie 仍使用 MVP 级轻量方案，不新增数据库 session 表。

### auth 层升级

新增统一的 `getSessionUser()`：

- 返回 `userId`
- 返回 `role`

保留 `getSessionRole()` 作为兼容层或薄封装。

### 页面与 API 调整

以下页面与 API 不再依赖 query/body 中传入的身份主键作为主身份来源：

- 摊主报名 API
- 主办方审核 API
- 摊位分配 API
- 主办方看板 API
- 摊主报名记录页
- 主办方申请页
- 主办方摊位页
- 主办方看板页

规则：

- 页面从 session 读取当前用户
- API 以 session userId 作为主归属依据
- 原 query 参数可以短期兼容读取，但不再作为首选

## 报名页前端闭环设计

### 用户路径

摊主从：

`/markets/[marketId] -> 报名页 -> 提交成功 -> 我的报名`

### 报名页内容

报名页最小表单应包含：

- 摊位偏好
- 报名备注
- 附件元数据输入区或最小上传占位
- 提交按钮

### 提交行为

- 调用 `POST /api/applications`
- `vendorId` 从 session 获取
- 成功后显示明确成功反馈
- 可跳转至 `/applications`
- 失败时展示错误信息

### 设计约束

- 本轮不做复杂多步骤向导
- 不做真实文件上传控件到 OSS
- 不做拖拽上传
- 只把报名链路真正接通

## 服务与 API 调整

### application service

需要同步切到新字段语义：

- `buildApplicationPayload()` 读取 `applicationNote`
- `reviewApplication()` 写入 `reviewNote`
- vendor 侧查询返回报名备注与审核备注的明确字段
- organizer 侧审核查询也返回明确字段

### applications API

- `POST /api/applications`
  - 不再信任 body 中的 `vendorId`
  - 使用 session userId
  - 持久化 `boothPreference`、`applicationNote`、`attachmentsJson`

- `POST /api/applications/[applicationId]/review`
  - 不再信任 body/query 中的 `organizerId`
  - 使用 session userId
  - 写入 `reviewNote`

## 页面范围

本轮主要影响页面：

- `/markets/[marketId]`
- `/markets/[marketId]/apply`
- `/applications`
- `/organizer/applications`
- `/organizer/stalls`
- `/organizer/dashboard/[marketId]`

其中重点新增/增强：

- 正式报名页
- 摊主报名结果页的备注展示
- 主办方申请页的审核备注录入

## 错误处理

### 报名场景

- 未登录：提示先登录或显示当前为开发期模拟登录要求
- 重复报名：返回 409 并展示重复报名提示
- 表单校验失败：字段级错误提示

### 审核与管理场景

- 身份不匹配：返回 403
- 资源不存在：返回 404
- 缺少 session userId：按未登录处理

## 测试策略

本轮必须坚持 TDD，并补齐以下测试：

- `Application` 新字段与旧兼容逻辑测试
- 报名 payload 测试
- 审核 payload 测试
- `POST /api/applications` session userId 测试
- `POST /api/applications/[applicationId]/review` session userId 测试
- 报名页渲染与提交测试
- 摊主报名记录页字段映射测试
- migration 相关验证
- `pnpm --filter web build`

## 风险

### 风险 1：四项 P0 耦合过高

缓解：

- 先做 schema 与 migration
- 再做服务和 API
- 最后做页面

### 风险 2：旧字段兼容导致读取混乱

缓解：

- 明确代码层新字段优先
- `note` 只做过渡兼容

### 风险 3：session 改造导致现有页面连锁变更

缓解：

- 保持 API 边界最先改造
- 页面优先加兼容分支再切主逻辑

## 完成标准

本轮 P0 扩展完成的判断标准：

1. `schema.prisma` 已更新并生成正式 migration
2. migration 可回放
3. 报名 API 与审核 API 使用 session userId
4. 报名页可以从详情页进入并完成提交
5. 摊主记录页和主办方审核页展示拆分后的备注语义
6. 全量相关测试通过
7. `pnpm --filter web build` 通过
