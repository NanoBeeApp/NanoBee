# worker/routes/artifacts.ts

## 文件职责
Artifacts API 路由:列出/读取/删除当前 owner 的 artifacts。artifacts 由聊天 agent 工具间接创建,这里**没有** create 端点。

## 核心导出 / API
- `artifactRoutes`：挂载于 `/api/artifacts`
- `GET /`：列出(倒序,含完整 deck)
- `GET /:id`：读取单个
- `POST /:id/favorite`：设置收藏,body `{ favorited: boolean }`(客户端传目标值,幂等),返回 `{ favorited }`,无此行 404
- `DELETE /:id`：删除

## 依赖关系
- 上游：`auth/*`、`artifacts/repo.ts`
- 下游：挂载于 `routes/api.ts`;前端经 typed RPC `apiClient.artifacts.*` 调用

## 关键实现思路
- owner = 登录用户 id 或 anon
- 创建走聊天工具,故无 POST;保持读取/删除为主

## 变更历史

### 2026-06-13 — 创建
- **出发点**：Artifacts 页面需要拉取聊天生成的卡片 deck
- **目标**：列/取/删三个只读+删除端点
- **关键决策**：不提供 create 端点,创建唯一路径是聊天 agent 工具,职责单一

### 2026-06-15 — 收藏端点
- **出发点**：artifacts 页加「你收藏的」tab,需要收藏开关
- **目标**：新增 `POST /:id/favorite`
- **关键决策**：客户端传目标 `favorited` 值(幂等,无读改写竞态),`setArtifactFavorited` 返回 null 时 404
