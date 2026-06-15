# components/artifacts/useArtifactsUrlSync.ts

## 文件职责
Artifacts 页面 URL search 参数(`?tab=&artifact=&vm=`)与 store 的桥接 hook,保证刷新/深链/前进后退后 tab、打开的 deck 与视图模式一致、可收藏分享。

## 核心导出 / API
- `DEFAULT_ARTIFACTS_TAB`('mine')、`DEFAULT_ARTIFACTS_VM`('list')
- `useArtifactsUrlSync()`：返回 `{ tab, setTab, viewMode, setViewMode }`

## 依赖关系
- 上游：`@tanstack/react-router`(getRouteApi/useNavigate)、`store/useAppStore.ts`(selectedArtifactId/selectArtifact)
- 下游：`ArtifactsView.tsx`

## 关键实现思路
- `tab` 只存 URL(页面本地);`setTab` 写新 tab 并丢弃 `artifact`(切 tab 即关详情);默认 tab 省略参数保持 URL 干净
- `artifact` ↔ store.selectedArtifactId 双向同步,**两侧各用 ref 记住上一次值**区分"真实变化"与"初始水合",只在真实差异时动作 → 收敛不循环、不互相清空:
  - URL→store:URL 有 artifact 就采用;param 从"有"变"无"(浏览器后退 / 切 tab)才清 store;初始空 URL 不动 store(避免把 `openArtifacts(id)`(聊天引用打开)已设的选中清掉)
  - store→URL:选中非空就写入;仅当选中由非空→null(真实关闭)才清 param;初始 null + 深链留给 URL→store 采用
- 支持刷新 / 深链 / 浏览器前进后退(URL 即状态铁律)
- 参照 `research/useResearchUrlSync` 的成熟模式

## 变更历史

### 2026-06-15 — 加 vm 视图模式
- **出发点**：列表/表格/卡片视图切换状态属于"能改变可见内容"的视图状态,须进 URL
- **目标**：viewMode + setViewMode 进 URL(`?vm=`),默认 list 省略
- **关键决策**：vm 像 tab 一样纯 URL(页面本地);用 `mkSearch` 统一构造 search 并在默认值省略;切 tab / 开关详情 / setViewMode 都保留其它两个参数(互不丢失)

### 2026-06-15 — 创建
- **出发点**：tabs 与打开的 deck 属于"能改变可见内容"的视图状态,按 URL 即状态铁律必须进 URL
- **目标**：tab + 选中 deck 进 URL 并与 store 同步
- **关键决策**：tab 纯 URL、artifact 双向同步;切 tab 丢 artifact 以关闭详情
