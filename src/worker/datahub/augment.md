# datahub/augment.ts

## 文件职责
上下文增强：用 LLM 把用户问题路由到 data-hub 的某个数据源，抓取实时数据并拼成 grounding 上下文，喂给回答模型。这是「不写死路由、数据源无限」的核心——NanoBee 内没有任何 `if 问的是HN` 的分支。

## 核心导出 / API
- `augmentWithData(env, aiConfig, userText): AugmentResult` — 返回 `{ messages, usedSource }`
- `AugmentResult` — `messages`（要 prepend 的 system 上下文）+ `usedSource`（命中的源 id 或 null）

## 流程
1. `listDataSources` 拉 catalog（空则不增强）
2. router LLM：给 catalog + 问题，模型返回 `{source, params}` 或 `{source:null}`（纯 JSON）
3. `parseDecision` 容错解析（兼容代码块/前后缀文字）
4. 命中则 `invokeDataSource` 抓取，把 `summary` 包成中文 system 上下文

## 依赖关系
- 上游：`routes/messages.ts`
- 下游：`ai/client`（generateChatText）、`datahub/client`、`config.ts`

## 关键实现思路
- 无 key / 空 catalog / router 拒绝 / 未知源 / 抓取失败 → 一律返回空，聊天照常。
- catalog 是唯一事实源：data-hub 新增源后此处自动可用，无需改 NanoBee。

## 变更历史

### 2026-06-12 — 创建
- **出发点**：用户要走通 HN 流程，并强调数据源可能无限多种、不要写死路由
- **目标**：LLM 动态选源选参，数据驱动、可无限扩展
- **关键决策**：用一次轻量 completion 做 JSON 路由（provider 无关），而非依赖各家 function-calling 协议差异
