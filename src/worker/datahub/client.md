# datahub/client.ts

## 文件职责
NanoBee 访问 data-hub（公开数据统一网关）的轻量客户端。NanoBee 不直连任何第三方数据 API，一律经 data-hub 发现并调用数据源。

## 核心导出 / API
- `isDataHubEnabled(env)` — 是否配置了 `DATA_HUB_URL`
- `listDataSources(env): DataSourceDescriptor[]` — 拉 catalog；禁用/不可达返回 `[]`
- `invokeDataSource(env, id, params): DataSourceResult | null` — 按 id 调用数据源；失败返回 `null`
- 类型：`DataSourceParam` / `DataSourceDescriptor` / `DataSourceResult`（镜像 data-hub 契约）

## 依赖关系
- 上游：`datahub/augment.ts`
- 下游：`DATA_HUB_URL` 绑定、`config.ts` 的 `DATA_HUB`、data-hub 的 `/api/sources*`

## 关键实现思路
- 全部失败路径吞掉并返回空值/降级，保证聊天链路永不因数据中心问题中断。
- 超时由 `CONFIG.DATA_HUB.REQUEST_TIMEOUT_MS` 控制。

## 变更历史

### 2026-06-12 — 创建
- **出发点**：走通「HN 开发者新闻」流程，需从 data-hub 取数据；且数据源可无限扩展
- **目标**：基于 catalog 的发现 + 按 id 通用调用，NanoBee 无需为每个源写代码
- **关键决策**：所有失败优雅降级，augmentation 是可选增强而非硬依赖
