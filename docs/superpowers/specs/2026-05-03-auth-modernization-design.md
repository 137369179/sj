# 认证升级 Design

## 目标

- 将现有演示登录升级为正式生产级认证系统。
- 采用 `Better Auth + Prisma + Email + Passkey(WebAuthn)` 构建 `邮箱 + 密码 + Passkey` 主认证链路。
- 将账号模型升级为“单账号多角色能力”，允许摊主和主办方公开注册，管理员保持后台控制。
- 修复匿名访问主办方工作区等权限缺口，统一页面、API 和中间件的认证边界。

## 当前上下文

- 当前 `apps/web/src/app/login/page.tsx` 仍是演示登录页，用户通过 `role + userId` 提交表单。
- 当前 `apps/web/src/lib/auth.ts` 仅基于 JWT Cookie 存 `userId` 与单一 `role`。
- 当前 `apps/web/prisma/schema.prisma` 的 `User` 只有 `phone`、`role`、`name`、`isVerified`，不支持邮箱密码、Passkey、多角色成员关系。
- 当前 `apps/web/src/middleware.ts` 只对已登录用户做角色纠偏，不会阻断匿名访问受限路由，已暴露 `ISSUE-006`。

## 方案对比

1. 推荐：`Better Auth + Prisma + WebAuthn`
   - 优点：更适合现有 Next.js/Prisma 单仓；支持数据库会话、Passkey、后续 OAuth 扩展；便于与业务角色和资料模型深度集成。
   - 缺点：比纯托管身份服务更需要自己处理一部分集成细节。

2. 备选：Clerk/Auth0 等托管身份服务
   - 优点：登录体验和身份产品能力成熟。
   - 缺点：多角色业务与深度授权仍需单独整合，数据边界更复杂。

3. 不推荐：继续扩展现有 JWT Stub
   - 优点：短期改动小。
   - 缺点：安全与扩展能力不足，不适合作为长期正式基座。

## 设计决策

### 1. 数据模型

- 以统一 `User` 作为业务 actor 主实体，保留现有业务表对 `userId` 的引用语义。
- 去掉 `User.role` 作为唯一角色来源，引入 `UserRoleMembership` 表示角色能力。
- 引入认证相关实体：`Account`、`Session`、`Verification`、`PasskeyCredential`。
- `phone` 从主登录标识降级为可选联系字段，新增 `email` 与 `emailVerifiedAt`。

### 2. 登录注册链路

- 公开注册允许选择 `vendor` 或 `organizer` 作为首个角色。
- 登录支持 `邮箱+密码` 与 `Passkey`。
- 注册完成后必须进行邮箱验证。
- 提供忘记密码、重置密码、登出、设备会话管理。

### 3. 多角色模型

- 单一账号可同时拥有 `vendor` 和 `organizer` 角色。
- 会话保存 `activeRole` 用于当前工作上下文。
- 服务端授权依赖“会话用户 + 角色成员关系 + 资源归属”联合判断。
- 管理员角色只能后台授予，不能公开注册。

### 4. 路由保护

- 中间件第一层拦截匿名访问受限路由。
- 服务端 guard 第二层校验角色成员关系和业务资源权限。
- 不再信任 query/body 里的身份注入。
- `ISSUE-006` 通过新守卫体系直接关闭。

### 5. 迁移策略

- 先引入新认证基座，再迁移页面和 API。
- 演示登录通过 `AUTH_ENABLE_DEMO_LOGIN` 开关保留给开发环境。
- 正式入口移除 demo 登录表单。
- 清理旧 `User.role` 依赖时分批推进，每批都做回归测试。

## 测试策略

- 单元测试：密码、令牌、会话、角色守卫。
- 集成测试：注册、验证、登录、重置密码、Passkey、多角色切换。
- 页面测试：登录页、注册页、账号中心。
- 中间件测试：匿名阻断、越权阻断、`returnTo` 回跳。
- 浏览器验收：密码登录、Passkey 登录、主办方直注册、匿名阻断。

## 风险与回滚

- 最大风险在 Prisma 数据模型调整与旧角色逻辑迁移。
- 回滚基线：认证表与角色成员关系分阶段落地，旧 demo 登录在过渡期可回开但生产默认关闭。
- 任一路由守卫改动都必须带回归测试，避免重新打开匿名访问漏洞。
