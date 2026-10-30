# Zotero MindFlow 仓库规范

先阅读工作区根目录 `d:\Dev Studio\Zotero Flow\AGENTS.md`（项目隔离、品牌、设置页视觉、版本与发布、验证口径）。本文件只补充本仓库的构建、验证与发布细节，冲突时以用户本次指令和根规范为准。

## 身份

- 用户可见名称：`Zotero MindFlow`；仓库：`groele/Zotero-MindFlow`；add-on ID：`mindflow@groele.org`（不得改动）。
- 职责：知识组织，即把文献、批注与想法整理成可编辑导图。不宣传未实现的跨插件自动化。
- 宿主：Zotero 10.x，当前 `strict_min_version` 为 `10.0`，`strict_max_version` 为 `10.0.*`。扩大范围前先在真实宿主验证，并分别报告“声明范围”与“实际验证范围”。

## 目录

| 路径 | 说明 |
|---|---|
| `source/` | React + TypeScript 前端源码（Vite），`source/tests/` 为前端单测 |
| `chrome/content/` | 插件界面；`assets/app.iife.js` 与 `index.html` 为构建产物，勿手改 |
| `bootstrap.js`、`chrome/content/scripts/` | 宿主侧逻辑（侧栏、菜单、文件读写、PDF 打开） |
| `locale/en-US`、`locale/zh-CN` | Fluent 本地化，两种语言键必须一一对应 |
| `scripts/` | 构建、打包、测试、发布校验脚本 |
| `docs/brand/product.json` | 品牌与版本元数据，`releaseStatus` 为 `released` 或 `unreleased` |
| `docs/release-tag-policy.md`、`docs/release-tag-migrations.json` | 标签策略与历史迁移记录（只作历史证据，不重跑） |
| `tests/` | git 忽略的本地测试产物 |
| `output/` | 候选包和验证证据，不自动视为最新源码 |

## 构建与验证

在 `source/` 下：

- `npm run typecheck`：类型检查。
- `npm test`：前端单测。
- `npm run build`：调用 `scripts/build-local.mjs`，生成 `chrome/content/assets/app.iife.js` 与 css，并给 `index.html` 的资源地址写入版本参数。

在仓库根目录：

- `node --test scripts/test-host.mjs`：宿主逻辑模拟测试。
- `python scripts/test-release-package.py`：发布包校验的自检。
- `python scripts/package-xpi.py --output <路径> --report <报告路径>`：可复现构建 XPI 并校验载荷与更新源。`--verify-only` 只检查已有包；`--update-feeds` 在构建后同步更新源哈希，只在正式发布时使用。
- `python scripts/release-tags.py --self-test`：标签校验自检。

CI（`.github/workflows/release-integrity.yml`、`tag-policy.yml`）运行上述宿主测试、发布包自检与打包校验，不得绕过失败。

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
