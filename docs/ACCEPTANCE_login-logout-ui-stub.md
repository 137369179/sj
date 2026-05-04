# 验收摘要：MVP 身份切换 UI 与退出链路

## 1. 验证目标

- **认证增强**：在当前基于 Cookie 的 Session Stub 基础上，补齐缺失的退出登录 API 和登录界面，使得身份切换在浏览器中不再依赖外部脚本工具（如直接发起 API 请求）。
- **AppShell UI**：在页面顶部导航栏提供直观的身份状态展示及操作入口。

## 2. 功能完整性

### 2.1 登录页与操作
- 新增 `app/login/page.tsx`：提供可视化的简易登录表单，允许用户手动选择角色（主办方/摊主）并输入用户 ID。
- `loginAction`：采用原生 Server Action 设置 HttpOnly Cookie（`mrp_session_role` 和 `mrp_session_user_id`），替代了之前只能通过接口调用的方式。
- 支持 `error=invalid_input` 的 UI 错误提示，并通过 URL `returnTo` 记录登录后的回跳位置。

### 2.2 退出链路
- 新增 API 路由 `POST /api/auth/logout`：清除了 `mrp_session_role` 和 `mrp_session_user_id` 两个 Cookie，安全断开会话。

### 2.3 全局 UI 组件
- 重构 `AppShell` 为 Server Component，支持读取当前 `sessionUser` 状态。
- 引入客户端组件 `AuthStatus`：在页面右上角根据登录态显示“退出登录”按钮及当前用户身份信息（如“主办方: org_1”）。未登录时展示“登录”按钮并引导至 `/login` 页面。
- 动态导航：仅当 `sessionUser.role === "vendor"` 时才渲染摊主端的“我的报名”和“我的通知”导航入口，避免导航污染。

## 3. 代码质量与环境说明

- 为新增的 `AuthStatus`、`LoginPage` 和 `POST /api/auth/logout` 添加了完整的 Vitest 覆盖（测试覆盖到了登录表单回显、组件挂载、退出 Cookie 删除等行为）。
- 解决了测试环境中的异步组件挂载错误：通过在测试文件中显式 `vi.mock` AppShell 为简单的 `div` 容器，隔离了因 `AppShell` 变更为 Server Component 引起的深度测试渲染失败。
- `pnpm --filter web test` 零错误通过（总计 150 个用例全部 PASS）。
- 没有引入新依赖，所有状态变更依旧遵循 Web 标准 API。