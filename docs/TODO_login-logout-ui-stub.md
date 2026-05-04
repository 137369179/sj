# 后续待办：认证体系增强与切换

## 当前状态与未覆盖项

- **仍然是 Stub 机制**：虽然补齐了可视化的登录与退出链路，但底层逻辑仍信任前端直接提交的明文 `userId` 和 `role`。这在 MVP 测试阶段可用，但绝不能带入生产环境。
- **无鉴权有效期**：当前 Cookie 虽然设置了 `HttpOnly` 和 `lax`，但未配置 `maxAge` / `expires`，依赖浏览器默认的会话级别生命周期。
- **缺失注册流程**：系统内仍没有 User 的注册链路，若用户输入的 `userId` 不在数据库（例如通过 Prisma Seed 生成的假数据）内，后续产生级联写入时可能会触发数据库级别的外键约束失败（如：插入 `Application` 找不到对应 `vendorId`）。

## 后续可选增强 (P0)

1. **真实鉴权集成**：
   - 接入标准的 JWT 或 OAuth 认证方案（如 NextAuth.js / Auth.js）。
   - 移除当前的 `loginAction` 手动模拟逻辑，接入真实的账号密码验证或手机号/验证码登录。

2. **路由级别的中间件拦截升级**：
   - 目前 `src/middleware.ts` 仅作粗颗粒度路由前缀拦截。引入真实鉴权后，需要在 Middleware 校验 JWT 签名有效性，防范伪造 Cookie。

3. **用户信息统一获取**：
   - 在 Server Components 或 Actions 获取用户身份时，如果需要真实校验用户有效性，应补充一次轻量级的 DB 校验（例如 `db.user.findUnique`）。