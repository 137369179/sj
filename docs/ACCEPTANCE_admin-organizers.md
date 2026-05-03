# 验收摘要：平台运营与审核后台 (P3-1)

## 1. 验证目标

- **Admin 命名空间构建**：增加平台管理员的专属视图，隔离普通的摊主与主办方业务。
- **主办方入驻管理**：允许管理员查看当前所有已入驻的主办方资质和运营数据。

## 2. 功能完整性

### 2.1 服务端层增强
- 新增 `server/admin/service.ts` 及 `listOrganizers` 服务：支持查询所有角色为 `organizer` 的用户。
- 结合 Prisma 聚合功能，返回每个主办方名下的**已发布市集数量 (`marketCount`)**。

### 2.2 平台管理 UI
- **专属路由 (`/admin/organizers`)**：新增入驻主办方列表页面。如果非 admin 身份访问，会自动重定向。
- **导航扩展**：在 `AppShell` 顶栏中为 `admin` 角色动态增加了“管理后台”的快捷入口。
- **AuthStatus**：当以管理员身份登录时，右上方状态栏会明确显示“平台管理员”。

### 2.3 开发者体验与数据填充
- 提供了可供初始化数据的 `prisma/seed.ts`（包含默认 Admin、Organizer 和 Vendor）。
- 在 `package.json` 中配置了 `pnpm db:seed` 快捷命令，方便在新环境中快速复现多角色状态。
- 添加了用于在没有外部 PostgreSQL 实例时快速起步的 `docker-compose.yml` 配置文件。

## 3. 代码质量与环境说明

- 对新加入的 `/admin/organizers` 页面及其依赖的后台服务均编写了严格的单元与集成测试。
- 中间件拦截与服务端身份校验（JWT）无缝兼容新的 admin 路由规则。
- `pnpm --filter web test` 稳定绿灯（**共计 154 个用例全部通过**）。