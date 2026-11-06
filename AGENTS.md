# Zotero MindFlow 仓库规范

先阅读工作区根目录 `d:\Dev Studio\Zotero Flow\AGENTS.md`（项目隔离、品牌、设置页视觉、版本与发布、验证口径）。本文件只补充本仓库的构建、验证与发布细节，冲突时以用户本次指令和根规范为准。

## 身份

- 用户可见名称：`Zotero MindFlow`；仓库：`groele/Zotero-MindFlow`；add-on ID：`mindflow@groele.org`（不得改动）。
- 职责：知识组织，即把文献、批注与想法整理成可编辑导图。不宣传未实现的跨插件自动化。
- 宿主：Zotero 10.x 至 12.x，当前 `strict_min_version` 为 `10.0`，`strict_max_version` 声明为 `12.*`。分别报告“声明范围”与“实际验证范围”。

## 目录

| 路径 | 说明 |
|---|---|
| `source/` | React + TypeScript 前端源码（Vite），`source/tests/` 为前端单测 |
| `chrome/content/` | 插件界面；`assets/app.iife.js` 与 `index.html` 为构建产物，勿手改 |
| `bootstrap.js` | 引导脚本：等待 Zotero、注册 chrome、以 `loadSubScript` 载入宿主入口 |
| `src/host/`、`src/preferences.ts` | 宿主侧 TypeScript **单一权威源**（侧栏、菜单、文件读写、PDF 打开、设置面板） |
| `chrome/content/scripts/` | **生成产物**，9 个 JS 全部由 `src/` 编译产生，禁止手改 |
| `locale/en-US`、`locale/zh-CN` | Fluent 本地化，两种语言键必须一一对应 |
| `scripts/` | 构建、打包、测试、发布校验脚本 |
| `docs/brand/product.json` | 品牌与版本元数据，`releaseStatus` 为 `released` 或 `unreleased` |
| `docs/release-tag-policy.md`、`docs/release-tag-migrations.json` | 标签策略与历史迁移记录（只作历史证据，不重跑） |
| `tests/` | git 忽略的本地测试产物 |
| `output/` | 候选包和验证证据，不自动视为最新源码 |

宿主持久化的单一实现位于 `src/host/storage.ts`（产物为 `.../modules/storage.js`）；
`workspaceLifecycle.ts` 管理关闭快照与队列稳定等待，`noteSync.ts` 管理大纲导出。
入口只能委托这些领域实现，不保留同一能力的回退副本。关系线持久化契约为
`fromId` / `toId`，存储与附件写入共用 `constants.ts` 中的校验器。

## 单一权威源与生成产物

- `src/` 是宿主侧唯一权威源。`scripts/host-build-targets.mjs` 定义全部 9 个运行时产物的生成规则；`build-source.mjs` 的 `[4/7]` 负责写入，`architecture-guard.mjs` **用同一份规则重新渲染并逐字节比对**。构建与守卫不得各写一套配方。
- `chrome/content/scripts/**/*.js`（含 `index.js`、`preferences.js` 与 `modules/*.js`）一律不得手改。改动先落在对应 `.ts`，再跑 `npm run build:bundle`；否则守卫的「溯源横幅」与「逐字节一致」两项会报红。
- 宿主入口的权威源是 `src/host/entry/` 下 **18 个有序编译期分片**（每个 ≤340 行，按职责命名）。`scripts/host-build-targets.mjs` 的 `ENTRY_PARTS` 声明顺序与行区间，`renderEntryScript()` 按序拼接；拼接结果与历史 IIFE **逐字节一致**。`bootstrap.js` 以 `Services.scriptloader.loadSubScript()` 载入自定义作用域，宿主测试夹具仍靠其中一行字面量注入测试钩子，因此不经 esbuild 重写。分片是编译期文本单元，不是独立 ESM 模块：三个方法本身超过 360 行，且 IIFE 共享 268 处 `this.` 与 215 处闭包引用。`tsconfig.json` 的 `exclude` 排除该目录，拼接产物由 `node --check` 与 116 项宿主测试验证；**不得**让单片 `src/host/index.ts` 回归。真正模块化重写仍需真实 Zotero 宿主验收。
- 生成产物首行必须带 `// [Generated … DO NOT EDIT DIRECTLY]` 溯源横幅。新增运行时脚本必须同时登记进 `host-build-targets.mjs` 的清单，否则守卫报红。
- 架构守卫共 **16 项**，其中 §5.2 有五类校验：TS/JS 全局导出名与常量一致、产物清单与横幅齐备、产物与 TS 源重渲染逐字节一致、宿主入口消费的全局名与产物挂载名一一对应（含设置面板必须挂在 `window`、原生测试注入锚点保留）、**任何 TS 源文件都不允许 `@ts-nocheck`**；§5.9 另校验分片清单完整、行区间连续、每片不超限且拼接无损。
- §5.9 冻结基线采用 `freeze-and-shrink`：条目必须仍存在、仍超过 360 行且不得超过记录行数，否则守卫按僵尸条目或增长报红；把模块拆到 ≤360 行后必须同步移除条目并写入 `splitHistory`。**全部债务清零时 `oversized` 允许为空，但必须在 `architecture-baseline.json` 显式声明 `"debtCleared": true`**；未声明的空基线仍被拒绝，且 `debtCleared` 为真时不得残留任何条目。第一项 §5.9 守卫始终拒绝任何新的 >360 行源文件，清空基线不等于关闭门禁。

## 构建与验证

在 `source/` 下：

- `npm run typecheck`：类型检查。
- `npm test`：前端单测。
- `npm run build`：调用 `scripts/build-local.mjs`，生成 `chrome/content/assets/app.iife.js` 与 css，并给 `index.html` 的资源地址写入版本参数。

在仓库根目录：

- `npm run build:bundle`（`node scripts/build-source.mjs`）：双端 typecheck → Vite 前端打包 → 从 `src/` 渲染 9 个运行时脚本 → 缓存串与语法/域大小/版本检查 → 16 项架构守卫。
- `npm run test:architecture`：只跑 16 项架构守卫，不重建产物，用于检查提交里是否混入手改的生成 JS。
- `node --test scripts/test-host.mjs`：宿主逻辑模拟测试。
- `python scripts/test-release-package.py`：发布包校验的自检。
- `python scripts/package-xpi.py --output <路径> --report <报告路径>`：可复现构建 XPI 并校验载荷与更新源。`--verify-only` 只检查已有包；`--update-feeds` 在构建后同步更新源哈希，只在正式发布时使用。
- 本地未发布版本使用 `python scripts/package-xpi.py --candidate --output <路径> --report <路径>`：要求 `releaseStatus: unreleased`，校验包载荷并生成哈希，不修改线上更新源，也不将其报告为已验证。该模式不能与 `--update-feeds` 同用。
- `python scripts/release-tags.py --self-test`：标签校验自检。

CI（`.github/workflows/release-integrity.yml`、`tag-policy.yml`）以 `npm ci` + `npm --prefix source ci` 锁定依赖，运行双端类型检查、16 项架构守卫、前端单测、宿主模拟测试、发布包自检与打包校验，不得绕过失败。esbuild 版本由根 `package-lock.json` 固定：守卫会重新编译全部产物并逐字节比对，编译器版本漂移会让 CI 直接报红，这是刻意设计。

## 原生测试

- 原生测试只在隔离 profile 中运行：`scripts/start-native-test.ps1 [-PackageName <xpi>] [-RegressionScript <脚本>]`，之后可用 `scripts/restart-native-test.ps1` 做重启验证。
- `-RegressionScript` 可指定专项脚本（例如 `native-pdf-open.js`），默认运行 `native-regression.js`。
- 每次启动自动保留最近 3 个 `tests/native-test-*` 目录；被清理目录的 `native-regression-results.json` 与 `native-ui.png` 会先归档到 `output/native-test-evidence/`。
- 不得用用户主 profile 或主库做写入测试。

## 修改约定

- 宿主侧新增注册（事件、observer、timer、窗口监听）必须在关闭、禁用和卸载时清理。
- 导出、备份、恢复保持“校验字节、失败不静默”的行为；大小上限和失败路径有现成测试，修改时同步补充，不得删断言。
- 新增用户可见文案时，同时修改 `locale/en-US/mindflow.ftl` 与 `locale/zh-CN/mindflow.ftl`。
- 设置页遵循根规范第 4 节；CSS 限定在插件自身容器内。

## 版本与发布

- 修改源码、测试、文档或构建配置的一轮工作都要递增版本；同一轮使用同一目标版本。
- 版本字段必须一致：`manifest.json`、`zotero/manifest.json`、`source/package.json`、`source/package-lock.json`（两处）、`docs/brand/product.json`、设置页版本徽标、构建后的 `index.html` 资源参数。
- 未发布期间 `product.json` 的 `releaseStatus` 为 `unreleased`；`update.json`、`zotero/update.json`、README 与设置页中的发布链接仍指向上一个已发布版本。
- 正式发布时：
  1. 构建并核对 XPI（`package-xpi.py`），用 `--update-feeds` 同步两份更新源与 `SHA256SUMS.txt`。
  2. 更新 README、设置页发布说明和 `docs/releases/` 下的发布说明，`releaseStatus` 改为 `released`。
  3. 使用 `scripts/release-tags.py --create-tag vX.Y.Z` 创建 annotated tag，标签指向已审阅、已构建的提交，发布后不移动。
  4. 推送分支与标签，创建 Release（标题 `Zotero MindFlow X.Y.Z`）并附 `zotero-mindflow-X.Y.Z.xpi`。
  5. 重新下载 XPI，比较 SHA-256，检查 ZIP、manifest、版本与更新源。
- 根目录与 `output/` 中的历史 XPI 不得自行删除；清理需用户授权。新包只作为 Release 资产发布，`.gitignore` 已忽略根目录新增的 `*.xpi`。
- 报告时区分：静态检查、单测、构建、真实 Zotero、GitHub 发布、用户环境安装，不互相替代。
