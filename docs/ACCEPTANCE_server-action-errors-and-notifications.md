# 验收摘要：Server Action 错误回显统一化与摊主通知 UI

## 1. 验证目标

- **Server Action 错误处理**：统一所有主办方操作（发布市集、审核申请、创建摊位、分配摊位）的错误捕获与页面回显。
- **摊主通知系统**：为摊主提供查看和标记已读的通知页面，形成通知闭环。

## 2. 功能完整性

### 2.1 主办方端 Server Action 错误回显
- `organizer/markets/page.tsx`：发布市集操作增加 `try-catch`，并支持返回特定的 `publishError`。
- `organizer/applications/page.tsx`：审核申请操作增加 `try-catch`，将 `ApplicationReviewError` 和 `ZodError` 映射到 URL 查询参数，实现错误信息 UI 回显。
- `organizer/stalls/page.tsx`：创建摊位、分配摊位操作分别增加异常捕获，并在各自对应的表单中就近展示对应的状态错误和字段级校验错误。

### 2.2 摊主端通知 UI
- **服务端实现**：增加了 `listVendorNotifications` 和 `markNotificationAsRead` 服务方法。
- **API 路由**：新建了 `POST /api/notifications/[notificationId]/read` 用于将通知标记为已读。
- **页面与交互**：新增了 `/notifications` 页面以及相应的列表组件 `NotificationList`，允许摊主查看通知列表并点击标记为已读。
- **导航扩展**：在 `AppShell` 中补充了“我的报名”和“我的通知”的入口链接。

## 3. 代码质量

- 所有错误捕获后都严格将特定的 `ErrorCode` 翻译为适合中文 UI 的友好提示（例如 `INVALID_STATUS` 翻译为“分配失败：只能分配给已通过审核且未分配的申请。”）。
- 维持了极简无 JS 阻塞的 Server Action 原则，出错时利用 `redirect` 及 URL 参数渲染状态。
- 为以上新功能编写了完整的 Vitest 测试用例（涉及页面和 API 接口），确保了核心路径不退化。
- `pnpm --filter web test` 跑通所有用例。

## 4. UI 还原度

- 通知列表在未读状态和已读状态间具有明显的样式区分（已读透明度降低），操作符合预期。
- 错误提示统一使用 `role="alert"` 和 `aria-invalid="true"`，保障无障碍标准。