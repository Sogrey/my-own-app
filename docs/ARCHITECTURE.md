# 整体架构说明

木子工作台是一款**本地单机全栈应用**：浏览器壳 + 本机 Fastify + SQLite。没有云、没有账号，核心约束是数据永不离开本机。

## 1. 总体形态

```text
本机浏览器                          Node 本地服务 :4317                 本机数据目录 MuziWorkspace
┌─────────────────┐                ┌──────────────────────┐           ┌────────────────────┐
│ React SPA       │  /api/*        │ Fastify API          │           │ data/app.sqlite    │
│ 开发 :3000      │ ─────────────► │ AppStore             │ ────────► │ backups/           │
│ 生产 :4317 静态 │                │ DatabaseManager      │           │ exports/           │
└─────────────────┘                │ BackupManager        │ ────────► │ logs/              │
                                   └──────────────────────┘           └────────────────────┘
```

运行时只有一个 Node 进程。生产模式下同一进程既提供 API，也用 `@fastify/static` 托管前端构建产物。

## 2. 分层职责

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 启动层 | `启动木子工作台.*` → `scripts/start-app.mjs` | 健康检查、单实例锁、首次构建、版本升级替换、打开浏览器 |
| 表现层 | `src/` | 路由页面、布局壳、三套外观、表单与图表 |
| 前端状态 | `WorkspaceContext` + TanStack Query | 拉取全量 state、统一写操作、保存状态 |
| 接口层 | `server/app.ts` | REST、Origin 校验、错误映射、静态资源 |
| 领域存储 | `server/store.ts` + `collections.ts` | 集合 CRUD、字段白名单、软删除、搜索 |
| 聚合 | `server/dashboard.ts` | 首页实时汇总（不落库） |
| 持久化 | `server/database.ts` | SQLite 打开、迁移、WAL、checkpoint、完整性检查 |
| 备份导出 | `server/backup.ts` | 完整 SQLite 备份、恢复前安全备份、ZIP 导出 |

设计取向是**薄 API + 厚 Store**：业务规则集中在服务端集合定义与 Store，前端主要做展示与编辑编排。

## 3. 前端结构

```text
main.tsx
  └─ QueryClientProvider
       └─ WorkspaceProvider          ← 全局工作区数据与 save 编排
            └─ App (Router)
                 └─ Layout           ← 导航 / 搜索 / 手动保存 / 外观
                      └─ 各业务 Page（lazy 加载）
```

- `src/api.ts`：唯一 HTTP 客户端，统一成功 `{ data }`、失败 `{ error }` 契约。
- `useWorkspace().run(op)`：写操作经 `api` 成功后增量 patch 本地 `workspace` 缓存，并刷新 `dashboard` / `system` / `backups` 等派生查询；全量 `/api/state` 仅用于首次加载与显式 `refresh()`。
- 页面按模块拆分，但数据模型是扁平集合（不是按页面隔离的 store）。
- 外观只改 `document.documentElement.dataset`（`appearance` / `theme`），与业务数据解耦。
- 三套外观：`liquid`（流光玻璃）、`notebook`（Notion 笔记）、`neo`（Neo-Brutalism），各支持浅色与深色。

路由与导航分组：

| 分组 | 路径 | 页面 |
| --- | --- | --- |
| 日常 | `/`、`/today` | 首页总览、今日计划 |
| 工作 | `/media`、`/development`、`/consulting` | 自媒体、开发、咨询 |
| 生活 | `/fitness`、`/diet`、`/entertainment` | 健身、饮食、娱乐 |
| 系统 | `/settings` | 数据与设置 |

## 4. 后端结构

`buildApp()` 组装依赖：

```text
DatabaseManager → AppStore → BackupManager
         ↓            ↓            ↓
      Fastify 路由统一注入使用
```

集合名与已知设置枚举在 `shared/schema.ts`，前后端共用。集合元数据仍集中在 `server/collections.ts`：表名、必填字段、可写字段、搜索字段、标题字段（并用 `satisfies` 对齐 shared 白名单）。增删改走同一套 Store，避免每个模块各写一套 SQL。扩展新业务时，通常改：

1. `database/migrations/*.sql`
2. `shared/schema.ts` + `server/collections.ts`
3. 前端对应页面（`WorkspaceState` 由 shared 集合名推导）

更细的表结构见 [DATA_MODEL.md](DATA_MODEL.md)，接口清单见 [API.md](API.md)。

## 5. 数据架构

### 5.1 领域关系

```text
plan_items（今日执行安排）
  └─ source_module / source_entity_type / source_entity_id
       ├─ media_contents
       ├─ dev_work_items 等
       ├─ consulting_deliverables / consulting_followups 等
       ├─ workouts / meals
       └─ entertainment_items

quick_memos ──convert──► 今日事项或各业务集合

开发：dev_projects → milestones / work_items / logs
咨询：clients → projects → interactions / deliverables / followups / time_entries
健身：templates → workouts → exercises → sets；另有 body_metrics
饮食：nutrition_targets / foods / meals → meal_items
娱乐：entertainment_items → play_sessions
系统：settings / trash_entries / schema_migrations
```

关键约定：

1. **计划与业务分离**：`plan_items` 只存何时执行；展示标题可实时解析来源，避免双写过期文案。
2. **首页不缓存**：`GET /api/dashboard` 每次从各集合现算时间线、待安排、关注项和模块摘要。
3. **软删除统一**：业务行写 `deleted_at`，并在 `trash_entries` 建可读索引；永久删除是独立接口。
4. **设置 KV 化**：`settings` 表存 JSON 值（外观、主题等）。

### 5.2 持久化策略

- SQLite + WAL + `synchronous=FULL` + 外键 + `busy_timeout`
- SQL 文件迁移位于 `database/migrations/`
- 备份是完整 SQLite 副本；列表元数据在 `backups/index.json`，与主库解耦
- 恢复前会创建 `safety` 类型安全备份；恢复文件需通过可读性、完整性和版本检查

数据目录与运维细节见 [OPERATIONS.md](OPERATIONS.md)。

## 6. 请求与保存流

日常编辑：

```text
业务页面
  → useWorkspace().run(() => api.create/update/...)
  → Fastify：Origin 校验（仅本机）
  → AppStore：sanitize + CRUD
  → SQLite
  → 前端 invalidate workspace / dashboard 等
```

保存语义有两层：

| 动作 | 实际含义 |
| --- | --- |
| 表单自动 / 即时提交 | 已写入 SQLite |
| 顶部「手动保存」 | 冲刷页面注册的草稿 handler + `POST /api/system/save`（WAL checkpoint + 完整性检查）；不退出 |
| 设置页「关闭本地服务」 | 先保存，再 `POST /api/system/save-and-exit` 安全关闭本机服务 |

直接关闭浏览器标签页不会停止服务；下次启动器会复用已有进程。

## 7. 开发与生产拓扑

| 模式 | 前端 | API | 数据 |
| --- | --- | --- | --- |
| `npm run dev` | Vite `:3000`，proxy `/api` | `tsx watch server` `:4317` | 本机数据目录（可用 `MUZI_DATA_DIR` 覆盖） |
| `npm run app:start` / 启动器 | Fastify 托管 `dist/` | 同一进程 `:4317` | 系统默认 `MuziWorkspace` |

启动器额外保证：

- PID / starting 锁，避免双击重复起多个服务
- `/api/health` 的 `buildId` 变化时，先安全停旧服务再换新构建
- 服务已在运行则复用并只打开浏览器

## 8. 横切能力

- **安全边界**：只监听 `127.0.0.1`；写请求拒绝非本机 Origin；无登录与多用户体系。
- **跨平台**：`server/platform.ts` 与 `scripts/platform.mjs` 统一数据路径、打开目录、打开浏览器。
- **隐私**：不加载在线字体、图片或图标；核心功能不依赖互联网。
- **测试**：Vitest 单元 / 组件 / 集成 → 生产服务冒烟 → Playwright 端到端验收。验收范围见 [ACCEPTANCE.md](ACCEPTANCE.md)。

## 9. 架构取舍

适合当前产品的点：

- 单体本地应用，部署模型极简（双击启动器）。
- 集合驱动的 CRUD 扩展成本低。
- 计划与业务解耦、首页聚合无副本，一致性较好。
- 备份与主库文件级分离，恢复路径清晰。

明确边界：

- `/api/state` 拉全量内存态，适合个人数据量，不适合大规模多用户。
- 业务逻辑偏服务端过程式 Store，不是严格领域事件驱动。
- 前端页面按模块拆分，但共享同一扁平 `WorkspaceState`。
- 无云同步与多设备；迁移靠复制整个 `MuziWorkspace` 目录。

## 10. 相关文档

- [产品需求文档](../PRD.md)
- [运行、备份与恢复手册](OPERATIONS.md)
- [数据模型](DATA_MODEL.md)
- [本地接口说明](API.md)
- [验收范围](ACCEPTANCE.md)
