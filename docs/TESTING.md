# 测试分层说明

木子工作台的自动化检查按速度与职责分层。总入口仍是 `npm run test:all`；日常开发优先跑更靠近改动的那一层。

## 金字塔

| 层级 | 命令 | 职责 | 典型目录 |
| --- | --- | --- | --- |
| 单元 | `npm run test:unit` | 纯函数、领域规则、校验与 store/dashboard | `tests/unit/` |
| 组件 | `npm test` 中的 `tests/components` | 壳层、通用 UI、外观切换 | `tests/components/` |
| 集成 | `npm run test:integration` | Fastify + SQLite 真实读写、备份/恢复 | `tests/integration/` |
| 生产冒烟 | `npm run test:production` / `test:artifact` | 构建产物、本机启动器、静态资源 | `tests/*.mjs` |
| 端到端 | `npm run test:e2e` | 真实 Chromium 验收；按描述分为外观与业务两组 | `tests/e2e/` |

## 约定

1. **能下沉的断言尽量不放在 E2E。** 删除语义、搜索转义、首页聚合优先写 `tests/unit/store.test.ts` / `dashboard.test.ts`。
2. **集成测试覆盖 HTTP 契约与 Origin 安全。** 写请求需带本机 Origin（`localWriteHeaders()`）。
3. **E2E 保持串行**（`workers: 1` + `mode: "serial"`），共用 `.test-data/e2e` 数据目录；外观用例与业务用例分在两个 `test.describe` 中，便于阅读，但仍共用同一浏览器服务。
4. **CI**：`verify` 在 macOS/Windows 跑 lint/typecheck/单测集成/构建/生产冒烟；Chromium E2E 在 Ubuntu 单独 job。

## 领域单测脚手架

```ts
import { createTestStore, removeTestDirectory } from "../helpers.js";

const { directory, manager, store } = createTestStore("label");
// ...
manager.close();
removeTestDirectory(directory);
```
