# 本地 API 概览

生产环境 API 基址为 `http://127.0.0.1:4317/api`。接口只为当前电脑上的前端服务，不是公网 API。写请求（POST / PATCH / PUT / DELETE）必须带本机 `Origin`（`http://127.0.0.1` 或 `http://localhost`，可含端口）；缺少 Origin 或来自外部 Origin 都会返回 403。

## 系统与读取

- `GET /api/health`：数据库完整性、迁移版本和服务状态。
- `GET /api/state`：全部未删除业务集合、设置和回收站。
- `GET /api/dashboard?date=YYYY-MM-DD`：首页当天聚合。
- `GET /api/search?q=...`：跨模块全文关键字搜索。
- `GET /api/system/status`：数据文件、目录、备份和失败状态。
- `POST /api/system/open-data-directory`：在 Finder 打开数据目录。
- `POST /api/system/open-path`：打开本地路径；仅允许数据目录内路径，或已保存的 `dev_projects.local_path`。

## 集合操作

- `GET /api/collections/:collection`
- `POST /api/collections/:collection`
- `PATCH /api/collections/:collection/:id`
- `DELETE /api/collections/:collection/:id`：软删除。
- `POST /api/collections/:collection/:id/restore`
- `DELETE /api/collections/:collection/:id/permanent`：仅回收站中的记录；删除父记录时数据库会级联硬删子行，并清理对应回收站索引

可用集合及字段白名单定义在 `server/collections.ts`，未知字段不会写入数据库。`planItems`、`mediaContents` 以及主题/外观/周起始/日期格式等已知设置项还会经过 `server/validation.ts` 的 Zod 枚举与类型校验。

## 业务动作

- `POST /api/plan-items/:id/complete`
- `POST /api/plan-items/:id/postpone`
- `POST /api/workouts/from-template`：按模板一次创建训练、动作与组（已有进行中训练时拒绝）
- `GET|PUT /api/daily-reviews/:date`
- `POST /api/quick-memos/:id/convert`
- `GET|PUT /api/settings`
- `GET /api/trash`

## 备份与导出

- `GET /api/backups`
- `POST /api/backups`
- `PATCH /api/backups/:id/metadata`
- `POST /api/backups/:id/restore`
- `POST /api/export`
- `GET /api/exports/:filename`

所有 JSON 响应的成功数据位于 `{ "data": ... }`；错误结构为 `{ "error": { "code": "...", "message": "..." } }`。
