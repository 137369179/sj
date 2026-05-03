# 主办方身份链路收尾后续事项

## 当前未覆盖

- 登录仍是最小 session stub，不是生产级认证系统
- 仍有更深层的权限增强空间，例如更细粒度审计与跨角色异常态保护
- service 层仍显式接收 `organizerId`，这是当前刻意保留的边界，不是问题但后续可继续评估

## 后续可选增强

- 增加更真实的认证、会话过期与刷新机制
- 为关键 API 增加统一的身份/权限 guard 封装
- 继续收口其它仍可能依赖显式用户 ID 的外围入口

## 环境备注

- 当前 `pnpm --filter web exec vitest run` 通过
- 当前 `pnpm --filter web exec tsc --noEmit` 通过
