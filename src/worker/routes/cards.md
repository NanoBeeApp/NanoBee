# worker/routes/cards.ts

## 文件职责
动态卡片 API 路由：`POST /api/cards/generate` 生成指定 kind 的卡片 deck。

## 核心导出 / API
- `cardRoutes`：Hono 子路由，挂载于 `/api/cards`
- `POST /generate`：入参 `{ kind, topic?, count?, locale? }` → 返回 `{ deck }`

## 依赖关系
- 上游：`worker/ai/settings.ts`(resolveAiConfig)、`worker/auth/*`、`worker/cards/generate.ts`、zValidator
- 下游：挂载于 `worker/routes/api.ts`；前端经 typed RPC `apiClient.cards.generate.$post` 调用

## 关键实现思路
- 复用 chat 的 per-user AI 配置；无可用 key 返回 400
- 当前仅展示、不落库(交互与保存后续再加)
- 生成失败统一返回 502

## 变更历史

### 2026-06-13 — 创建
- **出发点**：前端需要一个端点把卡片生成请求交给 AI
- **目标**：最小可用的生成端点，鉴权沿用现有 session
- **关键决策**：暂不做持久化，先走通"请求→生成→展示"闭环
