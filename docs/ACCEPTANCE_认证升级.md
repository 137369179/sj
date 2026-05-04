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
  - 已将摊主端报名列表升级为真实任务分组视图，按 `taskGroup` 展示“优先处理 / 处理中 / 已完成”并给出下一步动作提示
  - 已让摊主端根据最新审核动作区分“待补件 / 候补中 / 审核中”，避免所有 `under_review` 都显示成同一种状态
  - 已打通摊主补件回传入口：补件项可从“我的报名”直接进入补件页，并通过 `PATCH /api/applications/[applicationId]` 提交更新
  - 已在补件页展示“本次补件要求”和“当前已提交资料”，降低摊主盲目重复修改的成本
  - 已在通知页增加“本周需要关注”提醒，聚合补件与候补类通知
  - 已将“摊位分配已确认”纳入摊主通知页聚合指导：摊位分配完成后会明确提示先完成支付，再准备进场资料
  - 已打通支付完成回执：支付成功后系统会创建“支付已完成”通知，摊主通知页会进一步提示核对摊位安排并开始准备进场
  - 已补齐待支付时效提醒：摊位分配后若订单仍为 `pending`，摊主报名列表会基于订单创建时间提示“24 小时内完成支付”，临期时展示剩余小时数，超时后给出立即补救提示
  - 已打通主办方“超时释放档期”动作：主办方可在摊位管理页对超时未支付订单执行释放档期，系统会取消订单、释放摊位、将申请改为拒绝并写入“摊位支付超时，已释放档期”审核记录，同时通知摊主
  - 已补齐支付风险指标与结果语义：主办方看板新增“待支付 / 支付超时”计数，摊主报名列表在档期因支付超时被释放后会显示“重新报名”和明确结果回执
  - 已补齐主办方“催办支付”动作：主办方可在摊位管理页对未超时的待支付订单发送支付提醒，摊主通知页会收到“支付进度提醒”并把当前优先事项切换为先完成支付
  - 已补齐共享支付跟进语义：主办方摊位管理页和市集看板统一复用“正常推进 / 持续跟进 / 立即催办”优先级，并新增 `支付临期` 指标，避免页面各自维护不同的支付风险文案
  - 已补齐市场级支付漏斗：主办方看板新增“已创建支付单 / 已完成支付 / 已释放档期 / 支付完成率 / 释放率”，可直接回看当前市集的支付转化与释放情况
  - 已补齐催办效果回流：主办方看板会基于“支付进度提醒”通知与订单 `paidAt` 回流计算 `已发送催办 / 催办后支付 / 催办转化率`，可直接判断催办动作是否带来支付转化
  - 已补齐自动催办规则：主办方可在市集看板对 `支付临期` 订单执行一键自动催办，系统会只挑选 12 小时内到期且下单后尚未被催办过的待支付订单发送提醒，并回显本次自动催办数量
  - 已补齐自动释放策略：主办方可在市集看板对 `支付超时` 订单执行一键自动释放，系统会批量处理所有已超出 24 小时支付窗口的待支付订单，并沿用既有释放链路完成订单取消、摊位释放、申请拒绝和通知回执
  - 已补齐自动处理批次历史：自动催办和自动释放执行后会给主办方写入操作通知，市集看板新增“最近自动处理”区块，直接展示最近批次的动作与结果摘要
  - 已接入摊主端时效规则提醒：补件进入 24 小时内显示剩余小时数，超时后给出明确补救提示，候补状态展示观察期提醒
  - 已将摊主报名列表升级为更精确的动作回执视图：按状态展示“建议动作”和“进度回执”，补件、候补、待支付等关键阶段都有明确下一步提示
  - 已将主办方市集页升级为“招募进度总览”语义，首屏展示待审核申请、待确认摊主和空位风险
  - 已将主办方申请页升级为真实结构化审核动作，支持 `候补 / 补件 / 通过 / 拒绝` 四类动作并复用统一审核流
  - 已将结构化审核动作透传到服务端，支持 `supplement / waitlist` 留痕、通知与审核历史展示
  - 已为主办方申请列表补齐跟进规则层：可根据最新 `supplement / waitlist` 动作显示“立即催办 / 持续跟进”优先级，并展示补件超时、候补到期等规则提醒
  - 已为主办方申请列表接入真实跟进动作：支持直接发送“催办补件 / 通知补位”通知，并在列表中显示发送回执
  - 已打通摊主确认补位链路：摊主可在通知页直接确认候补补位，系统会把申请推进到 `approved` 并写入“摊主已确认候补补位”审核历史，主办方页可直接看到结果
  - 已将摊主确认候补后的列表回执升级为更具体的分配进展语义：确认补位后不再只显示泛化“已通过”，而会展示“等待分配结果”和“主办方正在安排摊位分配”的结果回执
  - 已为摊主确认候补后的分配阶段补齐时间预期：报名列表会提示“主办方通常会在 24 小时内同步摊位分配结果”，降低确认后的等待不确定性
  - 已打通摊主放弃补位链路：摊主可在通知页直接放弃候补补位，系统会把申请推进到 `rejected` 并写入“摊主已放弃候补补位”审核历史，主办方页可直接看到结果
  - 已补齐候补补位的“稍后确认”动作与主办方超时处理结果：摊主可先记录稍后确认，主办方可对超时未响应的候补执行“超时释放名额”，并在申请页看到处理回执
  - 已为主办方看板接入真实跟进风险指标，新增 `补件催办 / 候补待决 / 高优先风险` 计数
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
  - `pnpm --filter web test src/lib/__tests__/role-play.test.ts src/server/dashboard/__tests__/dashboard-service.test.ts src/app/__tests__/organizer-stalls-page.test.tsx src/app/__tests__/organizer-dashboard-page.test.tsx src/app/api/dashboard/markets/[marketId]/route.test.ts`
  - `pnpm --filter web test src/server/dashboard/__tests__/dashboard-service.test.ts src/app/__tests__/organizer-dashboard-page.test.tsx src/app/api/dashboard/markets/[marketId]/route.test.ts`
- 当前全量 Vitest 回归通过：
  - `pnpm --filter web test`
- 当前生产构建通过：
  - `pnpm --filter web build`

## 验收结论

- 认证升级主链路已完成从“演示型登录”到“正式认证基座”的迁移。
- 注册、登录、邮箱验证、找回密码、角色切换、路由保护、账号中心核心链路均已落地。
- 角色玩法升级已完成第一轮可见实现，摊主端和主办方端开始从“同一后台不同菜单”转向“机会产品 vs 招商控制台”的差异化体验。
- 账号中心已经具备基础设备管理能力，但仍有进一步精细化管理空间，详见 `docs/TODO_认证升级.md`。
