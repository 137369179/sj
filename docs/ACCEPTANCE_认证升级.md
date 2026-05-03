# 认证升级验收记录

## 验收范围

- 将演示型登录升级为 `Better Auth + Prisma + Email + Passkey`
- 接入邮箱注册、邮箱验证、密码登录、找回密码、重置密码
- 建立单账号多角色模型与 `activeRole` 切换
- 修复匿名访问 `/organizer/**`、`/admin/**` 的保护缺口
- 建立账号中心、Passkey 管理与设备会话管理基础能力

## 验收结果

- `apps/web/prisma/schema.prisma`
  - 已完成现代认证模型升级，包含 `Account`、`Session`、`Passkey`、`UserRoleMembership`
  - 已保留迁移期兼容字段，避免业务表身份语义被一次性打断
- `apps/web/src/lib/auth-config.ts`
  - 已接入 `Better Auth`、Prisma adapter、Passkey plugin 和 Next.js cookie 集成
- `apps/web/src/app/api/auth/[...all]/route.ts`
  - 已接入 Better Auth 官方 Next.js handler
- `apps/web/src/app/login/page.tsx`
  - 已从演示登录切换为正式登录页
- `apps/web/src/app/register/page.tsx`
  - 已提供正式注册页
- `apps/web/src/app/forgot-password/page.tsx`
  - 已提供找回密码入口
- `apps/web/src/app/reset-password/page.tsx`
  - 已提供重置密码入口
- `apps/web/src/app/verify-email/page.tsx`
  - 已提供邮箱验证状态页
- `apps/web/src/app/api/auth/register/route.ts`
  - 已接入邮箱注册和首角色创建
- `apps/web/src/app/api/auth/login/route.ts`
  - 已接入正式密码登录，并同步兼容 JWT cookie
- `apps/web/src/app/api/auth/session-sync/route.ts`
  - 已支持 Better Auth session 与兼容 cookie 的同步
- `apps/web/src/app/api/auth/forgot-password/route.ts`
  - 已接入找回密码能力
- `apps/web/src/app/api/auth/reset-password/route.ts`
  - 已接入密码重置能力
- `apps/web/src/app/api/auth/send-verification-email/route.ts`
  - 已接入验证邮件重发能力
- `apps/web/src/app/api/auth/roles/active/route.ts`
  - 已支持当前角色切换，并同步兼容 cookie 的角色 claims
- `apps/web/src/middleware.ts`
  - 已阻断匿名访问内部工作区，并统一 `returnTo` 回跳
- `apps/web/src/app/account/page.tsx`
  - 已接入真实账号中心数据聚合
- `apps/web/src/components/auth/account-center.tsx`
  - 已支持已开通角色概览与当前工作角色说明
  - 已支持未开通角色说明与能力引导
  - 已支持基础安全提示，包括 Passkey 绑定建议与多设备会话提醒
  - 已支持绑定 Passkey、切换角色、退出其他设备
  - 已支持删除单个 Passkey
  - 已支持重命名单个 Passkey
  - 已支持撤销单个设备会话
  - 已展示 Passkey 明细与设备会话明细
  - 已展示当前设备活跃状态、设备分类、登录时间、过期时间和 IP 摘要
- `apps/web/src/components/layout/auth-status.tsx`
  - 已增加登录后“账号中心”入口
- `apps/web/src/app/api/auth/login/route.ts`
  - 已记录成功登录审计日志
- `apps/web/src/app/api/auth/register/route.ts`
  - 已记录成功注册审计日志
- `apps/web/src/app/api/auth/roles/active/route.ts`
  - 已记录角色切换审计日志
- 角色玩法升级第一轮
  - 已完成共享角色玩法元数据，统一 `ROLE_LABELS`、`ROLE_GUIDANCE`、摊主任务分组和主办方优先事项
  - 已将摊主端市场列表升级为“机会优先”语义，新增“适合我的招募”、审核周期和主办方信誉提示
  - 已将摊主端报名页升级为“风险优先”语义，新增报名前确认提示与补件/确认超时说明
  - 已将摊主端报名列表升级为“待处理事项”语义，并在服务层补充 `taskGroup`
  - 已将主办方市集页升级为“招募进度总览”语义，首屏展示待审核申请、待确认摊主和空位风险
  - 已将主办方申请页升级为“优先处理申请”语义，增加候补/补件动作入口占位
  - 已将主办方看板页升级为“成场风险提醒”语义，强调确认率和空位风险
- `apps/web/src/components/layout/app-shell.tsx`
  - 已保持双角色产品入口语义，支持摊主侧“我的报名/我的通知”与主办方端分离导航

## 测试记录

- 认证相关专项与回归通过：
  - `pnpm --filter web test -- src/app/api/auth/passkeys/[passkeyId]/route.test.ts src/app/api/auth/sessions/[sessionId]/route.test.ts src/components/layout/__tests__/auth-status.test.tsx src/components/auth/__tests__/account-center.test.tsx`
- 账号中心专项与回归通过：
  - `pnpm --filter web test -- src/app/account/__tests__/account-page.test.tsx src/components/auth/__tests__/account-center.test.tsx`
- 角色玩法升级专项与回归通过：
  - `pnpm --filter web test -- src/app/__tests__/vendor-market-pages.test.tsx src/app/__tests__/vendor-apply-page.test.tsx src/app/__tests__/vendor-applications-page.test.tsx`
  - `pnpm --filter web test -- src/app/__tests__/organizer-markets-page.test.tsx src/app/__tests__/organizer-applications-page.test.tsx src/app/__tests__/organizer-dashboard-page.test.tsx`
  - `pnpm --filter web test -- src/components/layout/__tests__/app-shell.test.tsx src/server/applications/__tests__/application-service.test.ts`
- 当前全量 Vitest 回归通过：
  - `pnpm --filter web test`
- 当前生产构建通过：
  - `pnpm --filter web build`

## 验收结论

- 认证升级主链路已完成从“演示型登录”到“正式认证基座”的迁移。
- 注册、登录、邮箱验证、找回密码、角色切换、路由保护、账号中心核心链路均已落地。
- 角色玩法升级已完成第一轮可见实现，摊主端和主办方端开始从“同一后台不同菜单”转向“机会产品 vs 招商控制台”的差异化体验。
- 账号中心已经具备基础设备管理能力，但仍有进一步精细化管理空间，详见 `docs/TODO_认证升级.md`。
