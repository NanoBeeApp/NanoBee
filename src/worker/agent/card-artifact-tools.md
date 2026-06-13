# worker/agent/card-artifact-tools.ts

## 文件职责
`create_card_artifact` 这个 agent 工具——动态卡片功能的**聊天入口**。当聊天消息要求"看/学一组数据"(当前为英语单词)时,模型调用该工具:生成卡片 deck 并持久化为 artifact。工具价值在副作用(存下的 artifact 出现在 Artifacts 页),返回给模型的字符串只是确认。

## 核心导出 / API
- `cardArtifactTools(ctx)`：当 ctx 携带 artifact 上下文时返回 `[create_card_artifact]`,否则 `[]`

## 依赖关系
- 上游：`ai/settings.ts`(resolveAiConfig)、`cards/generate.ts`、`artifacts/repo.ts`、`cards/prompt.ts`、`agent/tools.ts`(AgentContext/AgentTool)
- 下游：`agent/tools.ts`(collectAgentTools 收集)

## 关键实现思路
- 复用请求的 per-user AI 配置(与聊天同一 provider)
- 生成后 push ArtifactRef 到 `ctx.artifacts.created`,由 messages.ts 挂到 AI 回复(→ 聊天内可点击卡片)
- 设 `timeoutMs: 90_000`,因生成是 LLM 调用,远超默认 20s 工具超时
- 仅在请求提供 artifact 上下文时暴露,未登录/anon 流程仍可用

## 变更历史

### 2026-06-13 — 创建
- **出发点**：用户要求卡片由聊天消息触发生成,而非独立输入页
- **目标**：把卡片生成做成 agent 工具,自然融入对话
- **关键决策**：工具以副作用持久化 artifact,经 AgentContext 把引用回传给请求处理器;自带长超时
