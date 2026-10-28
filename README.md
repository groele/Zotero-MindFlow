# Zotero MindFlow


**Zotero Flow Series · 知识组织**

*让研究的每一步衔接起来。 / Connect each step of research.*

将文献、批注与思路组织为可编辑导图。

[简体中文](README.md) · [English](README.en.md)

[![当前版本](https://img.shields.io/badge/version-12.5.10-245ac7?style=flat-square)](https://github.com/groele/Zotero-MindFlow/releases/tag/v12.5.10) · [下载 XPI](https://github.com/groele/Zotero-MindFlow/releases/download/v12.5.10/zotero-mindflow-12.5.10.xpi) · [问题反馈](https://github.com/groele/Zotero-MindFlow/issues)

[产品定位](#overview) · [安装与更新](#installation) · [快速开始](#quick-start) · [核心功能](#features) · [设置与使用](#settings) · [数据、同步与外部服务](#data) · [兼容性与验证范围](#compatibility) · [常见问题](#troubleshooting) · [开发与详细文档](#development) · [系列产品](#series) · [项目来源与许可](#license)

<a id="overview"></a>

## 产品定位

面向论文研读和知识整理，在 Zotero 内用画布与大纲组织文献材料、节点和任务，并按需使用 AI 生成研读草稿。

本插件可以独立安装，按需与系列其他插件组合使用。

<a id="installation"></a>

## 安装与更新

1. 下载 [zotero-mindflow-12.5.10.xpi](https://github.com/groele/Zotero-MindFlow/releases/download/v12.5.10/zotero-mindflow-12.5.10.xpi)（插件版本 **12.5.10**），不要安装 Source code ZIP。
2. 在 Zotero 打开 **工具 → 插件／附加组件**，从齿轮菜单选择 **从文件安装插件**。
3. 选择 XPI，完成安装；按提示重启 Zotero。

后续可在插件管理器中检查更新。自动检查／安装取决于 Zotero 与该插件的更新设置和兼容范围。升级或迁移前备份重要数据。

更新清单: [zotero/update.json](https://github.com/groele/Zotero-MindFlow/blob/main/zotero/update.json) · 插件 ID: `mindflow@groele.org`.

<a id="quick-start"></a>

## 快速开始

1. 选择文献，从工具栏、工具菜单或文献侧栏打开或创建导图。
2. 核对当前文献与导图，再导入摘要、笔记或 PDF 批注。
3. 编辑并保存；需要 Zotero 附件时执行归档，再检查保存结果。

<a id="features"></a>

## 核心功能

| 特色能力 | 能解决什么问题 | 实际边界 |
|---|---|---|
| 画布与大纲双视图 | 在可视画布和层级大纲之间组织研究问题、证据、方法与结论；支持节点、关系线、链接、备注、任务、搜索替换和小地图。 | 节点备注是纯文本；导图结构不自动证明论文结论或证据关系。 |
| 与 Zotero 条目一一关联 | 从选中文献、PDF、笔记与批注创建或补充导图；区分单篇论文、合集和独立导图，并提供文献侧栏入口。 | 标题、列表位置或导图内部 ID 不能单独认定为同一来源；用户应确认当前归档目标。 |
| 可靠归档、快照与恢复 | 本地工作区保存后，可显式归档为关联条目的 `.mindflow` 附件，并提供自动/手动快照、备份与恢复。 | PDF 与 `.mindflow` 是独立附件；恢复应先核对来源、时间和内容，避免以同名文件误合并。 |
| 丰富编辑与可移植导出 | 支持思维/逻辑/组织布局、主题、图片导入/粘贴、收件箱、模板、演示和专注模式；可导入或导出 Markdown、JSON、OPML、PNG、SVG、HTML、PDF 等适用格式。 | 图片随导图保存会增加文件体积；格式转换可能无法保留其他工具的全部语义。 |
| 可选 AI 研读草稿 | 通过已安装的 `llm-for-zotero` 使用用户已配置的模型和推理选项，生成可编辑的研读导图草稿并记录本次选择。 | MindFlow 不复制 API 密钥或自建模型供应商；草稿须对照原文复核，并由用户决定是否归档。 |
| 可选 WebDAV 工作区备份 | 使用用户配置的 HTTPS WebDAV 上传、保留版本并恢复工作区备份。 | 基础编辑可离线使用；WebDAV、AI 和 Zotero 远端文件能力各自依赖网络与外部服务条款。 |

<a id="settings"></a>

## 设置与使用

在 **Zotero → 设置 → Zotero MindFlow** 中查看插件偏好页。

设置打开方式、欢迎页、材料导入、自动大纲笔记和工作台入口；多个附件或窗口时，核对文献库、附件与当前导图。

<a id="data"></a>

## 数据、同步与外部服务

- 本地工作区位于 Zotero 数据目录的 mindflow/workspace；本地保存成功不等于已归档为 .mindflow 附件。
- 附件同步依赖 Zotero 的文件同步；WebDAV 工作区备份不包含完整 Zotero 数据库与所有 PDF。
- AI 会向所选模型服务提交本次材料；输出需要对照原文核验。

<a id="compatibility"></a>

## 兼容性与验证范围

| 项目 | 范围 |
|---|---|
| 当前插件版本 | 12.5.10 |
| 清单声明的 Zotero 范围 | `10.0` 至 `10.0.*` |
| 当前说明 | 当前清单限定 Zotero 10.0.x。12.3.4 设置页已在 Windows Zotero 10.0.6 原生检查（含同窗连续切换与 MetaFlow 卡片配色对照）；本轮未重跑真实 AI、WebDAV 或跨设备协作。 |

插件版本与 Zotero 版本分别管理。12.5.10 的宿主模拟、前端测试、类型检查、构建和 XPI 完整性校验均通过。此版本按钮修复未在真实 Zotero 窗口中单独点击验收；真实 AI 服务、WebDAV 与跨设备流程未重新验收。详见[版本说明](docs/releases/v12.5.10.md)。

<a id="troubleshooting"></a>

## 常见问题

保存后没有附件时，查看“本地保存”和“附件归档”各自状态；打开错图时记录选择的条目、附件、多图选择框与窗口切换顺序。

反馈时提供插件与 Zotero 版本、系统、操作步骤、预期／实际结果和脱敏错误。

<a id="development"></a>

## 开发与详细文档

普通安装无需开发环境。以下为仓库已有开发入口，涉及原生测试时使用独立配置。

```powershell
npm ci --prefix source
node scripts/build-local.mjs
node --test scripts/test-host.mjs
python scripts/test-release-package.py
python scripts/package-xpi.py --update-feeds
python scripts/package-xpi.py --verify-only
```

- [审查文档索引 / Audit documentation](docs/README.md)
- [版本说明 / Release notes](docs/releases/v12.5.10.md)
- [产品简介 / Product profile](docs/brand/PRODUCT.md)
- [品牌规范 / Brand guide](docs/brand/BRAND.md)
- [README 模板 / README template](docs/brand/README-TEMPLATE.md)
- [后续提升清单 / Improvement priorities](docs/brand/IMPROVEMENTS.md)
- [原详细指南 · README.md](docs/reference/README.md)

原详细指南保留功能细节、快捷键、历史验证与完整致谢；其中版本和测试结果属于各自记录时间。

<a id="series"></a>

## 系列产品

| 产品 | 定位 |
|---|---|
| [Zotero RefFlow](https://github.com/groele/Zotero-RefFlow) | 文献发现 · 检索参考文献、被引文献与相关研究。 |
| [Zotero MetaFlow](https://github.com/groele/Zotero-MetaFlow) | 元数据整理 · 校验、规范并补全文献元数据。 |
| [Zotero ViewFlow](https://github.com/groele/Zotero-ViewFlow) | 阅读预览 · 在 Zotero 侧栏预览并复制格式化引文。 |
| [Zotero MindFlow](https://github.com/groele/Zotero-MindFlow) | 知识组织 · 将文献、批注与思路组织为可编辑导图。 |
| [Zotero TaskFlow](https://github.com/groele/Zotero-TaskFlow) | 任务推进 · 将文献研读转化为可追踪的任务与计划。 |
| [Zotero CiteFlow](https://github.com/groele/Zotero-CiteFlow) | 写作引用 · 追踪 Word 文档引用，并连接 Zotero 文献操作。 |
| [Zotero PaperFlow](https://github.com/groele/Zotero-PaperFlow) | 投稿审稿 · 管理手稿、投稿轮次与审稿回复。 |

各插件分别安装和更新；同属一个系列不意味着共享数据库或已自动联通所有流程。

<a id="license"></a>

## 项目来源与许可

**开发来源声明：** 当前维护仓库的 README、包元数据和许可证未声明 MindFlow 基于某个第三方 Zotero 插件二次开发；它作为独立维护的 Zotero Flow 插件发布。`llm-for-zotero` 是可选的运行时集成，用于复用用户已配置的模型与凭据，**不是** MindFlow 的代码二次开发来源。

项目代码按 MIT 许可发布；论文、图片、第三方依赖与外部模型服务遵循各自权利与条款。

许可: [MIT](LICENSE).

本系列独立维护，并非 Zotero 官方产品。Zotero 及第三方名称、商标与材料归各自权利人所有。

[Release/tag policy](docs/release-tag-policy.md)
