# 改进意见与优化清单

本文档记录木子工作台整体评估后的改进项，按优先级依次推进。完成一项后把状态改为「已完成」，并在「变更记录」补一行。

相关背景：[整体架构说明](ARCHITECTURE.md)、[验收范围](ACCEPTANCE.md)、[产品需求](../PRD.md)。

## 执行顺序

```text
P0 本机安全与删除语义
 → P0 类型校验起步
 → P1 假设置 / deep-link / 增量状态
 → P1 测试分层与锁文件
 → P2 体验与体验收尾
```

当前进度：**P0–P2 清单已清完（P2-5 延期，非 MVP）**。

---

## P0 — 正确性与本机安全

| ID | 项 | 状态 | 位置 | 方向 |
| --- | --- | --- | --- | --- |
| P0-1 | 写操作缺少 Origin 时仍放行 | 已完成 | `server/app.ts` | 写操作必须带本机 `Origin`；补「无 Origin → 403」测试 |
| P0-2 | `open-path` 可打开任意本机路径 | 已完成 | `server/app.ts` | 仅允许数据目录内路径，或已保存的 `dev_projects.local_path` |
| P0-3 | 永久删除与 FK `CASCADE` 语义不清 | 已完成 | `server/store.ts`、`collections.ts` | 软删不级联；永久删清理子树 trash；设置页提示关联删除 |
| P0-4 | `Entity = any`、字段几乎无类型校验 | 已完成（起步） | `server/validation.ts`、`store.ts` | 已为 planItems / mediaContents / 已知 settings 补 Zod；其余集合后续扩展 |

---

## P1 — 高价值

| ID | 项 | 状态 | 位置 | 方向 |
| --- | --- | --- | --- | --- |
| P1-1 | `weekStart` / `dateFormat` 保存但不生效 | 已完成 | `SettingsPage`、`utils.ts`、`TodayPage`、`DashboardPage` | 格式化与本周视图真正读设置 |
| P1-2 | 搜索 / 摘要 / 打开来源只跳模块页 | 已完成 | `moduleRoutes.ts`、`Layout.tsx`、各页面 | 统一 `?focus=id`；页面挂载后打开对应记录 |
| P1-3 | 每次写操作全量 `/api/state` | 已完成 | `api.ts`、`workspaceState.ts`、`WorkspaceContext` | 写接口 emit mutation，本地 patch；仅刷新 dashboard 等派生查询 |
| P1-4 | 页面巨型 JSX + `props: any` | 已完成（起步） | `pages/*/Dialog.tsx`、`pageTypes.ts`、`moduleRoutes` | 拆出健身/饮食/咨询 Dialog 与健身 helpers；共享来源标签；Dialog 类型收紧 |
| P1-5 | 测试偏重 E2E、领域单测不足 | 已完成（起步） | `tests/unit`、`docs/TESTING.md`、e2e describe | 补 store/dashboard 单测；E2E 分外观/业务组；补充测试分层文档 |
| P1-6 | 同时存在 npm / pnpm 锁文件 | 已完成 | 仓库根 | 保留 npm（`package-lock.json`），移除 pnpm 锁与 workspace 文件 |
| P1-7 | 软删无 Undo；延期仅「明天」；备忘转换过窄 | 已完成 | WorkspaceContext、TodayPage、DashboardPage | 软删底部 Undo；延期可选日期；备忘可转客户/娱乐/训练模板/食材 |

---

## P2 — 锦上添花

| ID | 项 | 状态 | 方向 |
| --- | --- | --- | --- |
| P2-1 | 工作区加载失败时业务页当空数据 | 已完成 | `Layout.tsx` | 加载中骨架；失败显示 `ErrorState` + 重试，不再渲染空业务页 |
| P2-2 | 开始训练连环 `create` | 已完成 | `store.startWorkoutFromTemplate`、`/api/workouts/from-template` | 单接口事务实例化训练/动作/组；前端一次调用 |
| P2-3 | 搜索 `LIKE` 未转义 `%`/`_` | 已完成 | `store.search` | `%`/`_`/`\` 转义 + `ESCAPE '\\'`；单测覆盖 |
| P2-4 | settings / CollectionName 双份定义 | 已完成 | `shared/schema.ts` | 集合名与已知设置枚举前后端共用；服务端 `satisfies` 对齐 |
| P2-5 | 非签名安装包门槛 | 延期 | 发行流程 | 非 MVP：当前本机启动器足够；签名安装包留待正式分发时再做 |

---

## 验收对照提醒

- AC-003：本机绑定与外部 Origin 拒绝 —— 收紧后需补「无 Origin」用例。
- AC-027 / AC-028：软删、回收站、永久删除 —— P0-3 后软删仍不级联；永久删会硬删子树并清理 trash。
- AC-029：设置持久化 —— P1-1 后应同时断言界面生效，而不只是存盘。

---

## 变更记录

| 日期 | 项 | 说明 |
| --- | --- | --- |
| 2026-10-31 | 文档建立 | 根据整体评估写入本清单，开始按 P0→P1→P2 依次优化 |
| 2026-10-31 | P0-1 | 写操作强制本机 Origin；缺 Origin 或外部 Origin 返回 403 |
| 2026-10-31 | P0-2 | `open-path` 限制为数据目录或已保存项目路径 |
| 2026-10-31 | P0-3 | 永久删除登记子树并清理 trash；软删保持不级联 |
| 2026-10-31 | P1-1 | `weekStart` / `dateFormat` 接入今日计划本周视图与日期展示 |
| 2026-10-31 | P0-4 | 新增 `server/validation.ts`，校验计划/自媒体枚举与设置项 |
| 2026-10-31 | P1-2 | 搜索/摘要/打开来源改为 `?focus=id`，各模块页打开对应编辑态 |
| 2026-10-31 | P1-3 | 写操作增量 patch workspace，不再每次全量拉 `/api/state` |
| 2026-10-31 | P1-4 | 拆出 Fitness/Diet/Consulting Dialog 与共享 pageTypes、来源标签 |
| 2026-10-31 | P1-5 | 新增 store/dashboard 单测、TESTING.md；E2E 按外观/业务分组 |
| 2026-10-31 | P1-6 | 删除 pnpm-lock.yaml / pnpm-workspace.yaml，统一 npm |
| 2026-10-31 | P2-3 | 搜索关键字按字面匹配，转义 LIKE 通配符 |
| 2026-10-31 | P1-7 | 软删 Undo toast；今日计划延期到指定日期；快速备忘转换扩展 |
| 2026-10-31 | P2-1 | 工作区加载失败时壳层展示错误与重试，不再假装空数据 |
| 2026-10-31 | P2-2 | 新增从模板开始训练的单接口，替换前端连环 create |
| 2026-10-31 | P2-4 | 抽出 `shared/schema.ts` 统一 CollectionName 与设置枚举 |
| 2026-10-31 | P2-5 | 明确延期：签名安装包非本机 MVP 范围 |
