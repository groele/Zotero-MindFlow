# Zotero MindFlow

**Zotero Flow Series · 知识组织**

_让研究的每一步衔接起来。 / Connect each step of research._

**将文献、批注与思路组织为可编辑导图。**

[简体中文](README.md) · [English](README.en.md)

[![Version](https://img.shields.io/badge/version-13.0.3-245ac7?style=flat-square)](https://github.com/groele/Zotero-MindFlow/releases/tag/v13.0.3)
[![Zotero Compatibility](https://img.shields.io/badge/Zotero-10.0--12.*-brightgreen?style=flat-square)](https://www.zotero.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](LICENSE)
[![Tests Passing](https://img.shields.io/badge/tests-111%20passed-success?style=flat-square)](https://github.com/groele/Zotero-MindFlow)

[📦 下载 XPI](https://github.com/groele/Zotero-MindFlow/releases/download/v13.0.3/zotero-mindflow-13.0.3.xpi) · [📝 更新日志](docs/releases/v13.0.3.md) · [💬 问题反馈](https://github.com/groele/Zotero-MindFlow/issues)

[📖 产品定位](#overview) · [📦 安装与更新](#installation) · [🚀 快速开始](#quick-start) · [🛠️ 核心功能](#features) · [✨ 深度特性解析](#highlights) · [⚙️ 设置与使用](#settings) · [🔒 数据、同步与外部服务](#data) · [🧪 兼容性与验证范围](#compatibility) · [❓ 常见问题](#troubleshooting) · [💻 开发与详细文档](#development) · [🔗 系列产品](#series) · [📄 项目来源与许可](#license)

---

<a id="overview"></a>

## 📖 产品定位

**Zotero MindFlow** 面向论文深度研读、开题综述、结构化提炼与课题知识组织。它打破了传统文献库条目与外置思维导图工具之间的割裂，深度内嵌于 Zotero 原生生态，直接在工作台与文献侧栏内以**自由画布（Canvas）**与**层级大纲（Outline）**组织文献材料、提取批注、标记任务，并可按需借力 AI 一键生成结构化研读草稿。

作为 **Zotero Flow** 系列的核心构件之一，本插件完全支持独立安装运行，亦可与系列其他组件紧密配合，贯穿从文献发现、知识组织到写作引用的完整学术链路。

---

<a id="installation"></a>

## 📦 安装与更新

### 规范安装参数

| 规范指标 | 官方参数与要求 |
|---|---|
| **插件标识 (Add-on ID)** | `mindflow@groele.org` |
| **当前正式版** | `v13.0.3` (Patch Release) |
| **宿主兼容范围** | Zotero `10.0` 至 `12.*`（全面适配 10.x / 11.x / 12.x 原生界面与亮暗主题） |
| **安装包文件名** | `zotero-mindflow-13.0.3.xpi` |
| **发布文件大小** | `531,492 字节` |
| **SHA-256 校验和** | `38cffd12ce7e848f80148b88bb8442c167dd1e15c29f6416bd5887f70b4fbbbb` |
| **在线更新源** | [zotero/update.json](zotero/update.json) |

### 安装步骤

1. 从官方 Release 下载最新的正式发布包 [zotero-mindflow-13.0.3.xpi](https://github.com/groele/Zotero-MindFlow/releases/download/v13.0.3/zotero-mindflow-13.0.3.xpi)（**当前正式版 v13.0.3**，请直接下载 XPI 文件，切勿下载 Source code 源码压缩包）。
2. 在 Zotero 顶部菜单依次打开 **工具 → 插件／附加组件**（Tools → Plugins / Add-ons）。
3. 点击附加组件管理器右上角的**齿轮设置图标**，选择 **从文件安装插件...**（Install Add-on From File...），或直接将下载好的 `zotero-mindflow-13.0.3.xpi` 拖入窗口。
4. 选中已下载的 `zotero-mindflow-13.0.3.xpi` 文件完成载入，根据系统提示重启 Zotero。

> [!TIP]
> **更新与校验说明**  
> - **在线自动更新**：更新清单由不可变资产源托管于 [zotero/update.json](zotero/update.json)，后续可在 Zotero 插件管理器中直接自动或手动检查升级。  
> - **文件校验和**：`38cffd12ce7e848f80148b88bb8442c167dd1e15c29f6416bd5887f70b4fbbbb` (SHA-256)。  
> - **下载重命名提示**：部分浏览器（如 Safari 或 Edge 某些配置）可能在下载后自动将扩展名改为 `.zip`。遇到此情况请将其重新命名为 `.xpi` 后再进行安装。  
> - **数据安全建议**：跨大版本升级前，建议在 MindFlow 设置中先导出工作区完整备份。

---

<a id="quick-start"></a>

## 🚀 快速开始

三步建立起专属文献的知识导图：

```mermaid
graph LR
    A["1. 选中文献"] --> B["2. 一键创建/提取"]
    B --> C["3. 双视图编辑与归档"]
    style A fill:#f1f5f9,stroke:#94a3b8,stroke-width:1px
    style B fill:#e0f2fe,stroke:#38bdf8,stroke-width:1px
    style C fill:#dcfce7,stroke:#4ade80,stroke-width:1px
```

1. **选中文献与开启导图**：在 Zotero 文献列表中选中目标论文，展开右侧文献信息栏（ItemPane）中的“思维导图”区域，点击 **一键生成思维导图**（或 **打开思维导图工作台**），亦可直接点击 Zotero 主工具栏的 MindFlow 旋翼图标。
2. **提取材料与结构梳理**：选用内置研读模板（如“论文精读”），一键抓取文献元数据、摘要与高亮笔记；利用全键盘流式操作（`Tab` 插入子节点，`Enter` 在下方插入同级节点，`Shift + Enter` 在上方插入同级节点）迅速勾勒主线。
3. **安全保存与多模态归档**：本地编辑实时自动保存；点击工具栏 **归档到 Zotero**（或按下 `Ctrl + S`），系统将生成与该文献条目唯一绑定的 `.mindflow` 专属附件，或一键导出为免安装的单文件离线交互 HTML。

---

<a id="features"></a>

## 🛠️ 核心功能

| 特色能力 | 能解决什么问题 | 实际边界与使用提示 |
|---|---|---|
| **画布与大纲双向同构** | 自由画布可视化发散思考，结构大纲专注高效线性输入；支持毫秒级无损双向切换、全图搜索替换与小地图导航。 | 节点备注支持富文本/纯文本展示；导图的层级逻辑属于研究者思维模型，不代表论文客观因果关系的自动证明。 |
| **文献条目原生双向绑定** | 导图与 Zotero 文献条目、合集或独立主题唯一锚定；右侧文献侧栏（ItemPane）原生嵌入，实时展示关联导图状态与快捷动作。 | 文献标题或文件名变动不影响内部绑定关系；跨库迁移或重复条目时，请确认归档的目标父条目。 |
| **专业学术研读模板体系** | 开箱即用内置 8 套学术研读框架（论文精读、完整研究解析、速读概览、证据链、实验复现、理论与计算、机理辨析、综述与对比），支持用户自定义模板。 | 预置模板提供科学的思考线索，研读深度仍依赖研究者对文献实质内容的判断。 |
| **严密归档、快照与灾备** | 本地工作区防丢引擎实时落盘，一键归档为文献条目的 `.mindflow` 附件；内置多版本快照回滚与 Schema v2 备份安全门禁。 | `.mindflow` 附件与 PDF 独立存储；恢复备份时建议先确认时间戳与来源，避免覆盖并发编辑中的新版本。 |
| **高保真全要素导出生态** | 支持导出独立**离线交互 HTML**（内嵌矢量样式与折叠脚本，随处离线可读）、排版级矢量 **SVG**、高清 **PNG**、**Markdown**、**OPML** 与原生 **JSON**。 | 导出包含复杂内嵌图片时会适度增大文件体积；第三方格式（如 OPML）转换可能无法全量保留专属连线曲率。 |
| **可选 AI 智能研读草稿** | 依托本地已安装的 `llm-for-zotero` 运行时，安全免密调用本地配置的模型，将文献摘要、笔记与 PDF 材料提炼为结构化导图草稿。 | MindFlow 不自建云端中间层，不截留 API 密钥；AI 生成结果作为待复核草稿呈现，需由研究者核实原文后决定归档。 |
| **可选 WebDAV 工作区备份** | 支持配置标准 HTTPS WebDAV 协议，实现工作区备份的远端安全上传、历史版本存根与跨设备恢复。 | 基础绘图与本地归档完全离线可用；WebDAV 远端同步与网络质量及服务商存储配额相关。 |

---

<a id="highlights"></a>

## ✨ 深度特性解析

### 1. 深度原生集成的文献侧栏（ItemPane）
不同于传统浮动窗口，MindFlow 深度适配了 Zotero 10 / 11 / 12 的原生侧栏规范。在右侧文献信息窗中：
- 实时感知当前所选文献条目或正在阅读的 PDF 附件；
- 显示该条目关联的导图列表、卡片缩略信息与修改时间；
- 提供“打开思维导图工作台 / 一键生成思维导图”、“小窗（PDF并排阅读）”、“打开 PDF”、“导入导图（MindFlow/JSON/Markdown/OPML）”与“新建空白导图”等一步到位的快捷动作；
- 完美契合 Zotero 宿主自适应亮色与暗色模式，色彩无缝融入。

### 2. 自由画布与线性大纲的“双面一体”
- **画布模式（Canvas Mode）**：支持自由拖拽排布、网格吸附、曲线风格自定义（贝塞尔平滑流、正交圆角折线、极简直线）、节点富文本装饰、优先级标签以及连线关系标注。
- **大纲模式（Outline Mode）**：极简树状层级视图，支持纯键盘高速录入，结构拖拽重组。
- **全键盘流畅交互**：
  - `Space` / 双击节点：进入节点文本编辑模式
  - `Tab`：新增子分支节点
  - `Enter`：在下方新增同级节点
  - `Shift + Enter`：在上方新增同级节点
  - `Delete` / `Backspace`：删除选中节点及其子分支
  - `Ctrl + S` / `Cmd + S`：快速落盘并触发 Zotero 附件归档
  - `Ctrl + F` / `Cmd + F`：全图即时搜索与替换
  - `Ctrl + Z` / `Ctrl + Y`（或 `Cmd + Shift + Z`）：撤销 / 重做
  - `Ctrl + C` / `Ctrl + V`：复制 / 粘贴分支
  - `Ctrl + D`：快速创建分支克隆副本
  - `F5` / `Alt + P`：切换全屏演示模式
  - `Ctrl + 1` / `Ctrl + 0`：自适应全画布 / 恢复 100% 缩放
  - `?`：打开快捷键帮助面板
  - 方向键（`↑` / `↓` / `←` / `→`）：按空间位置导航选中节点
  - 点击分支连接圆点：快速折叠 / 展开子分支

### 3. 全要素离线交互 HTML 导出（Killer Feature）
通过 MindFlow 导出的 **Interactive HTML** 彻底颠覆了静态图片的分享方式：
- **单文件零依赖**：导出的 HTML 文件自包含所有矢量绘制引擎与样式，无需安装 Zotero 或任何第三方应用；
- **全动态交互体验**：接收者可以在任意现代浏览器中自由**平移平滑拖拽**、**滚轮缩放**、**点击收缩/展开分支**；
- **微元与状态保真**：完美还原节点任务徽标（待办灰标、进行中蓝标、已完成绿标）、删除线与透明度状态，是组会汇报、学术交流与科研归档的理想格式。

### 4. 8 套内置学术研读模板与 Schema v2 备份
- **科学研读模板体系**：开箱即用内置 8 套经学术检验的研读模板（`chrome/content/research-templates.json`）：
  - **论文精读（按发现组织）**：核心问题 → 研究体系与证据路线 → 关键发现与机制 → 问题回应与意义 → 局限与验证；
  - **完整研究解析**：全要素覆盖背景、假设、方法、机理、贡献与后续；
  - **速读概览**：聚焦核心问题、关键发现与核心贡献，适合快筛文献；
  - **证据链（结论溯源）**：严格锚定结论、直接证据、对照实验与数据支撑；
  - **实验复现指南**：突出材料体系、关键工艺参数、表征手段与对照设计；
  - **理论与计算**：梳理理论模型假设、控制方程、关键预测与适用边界；
  - **机理辨析**：细化微观作用机理、因果推断链条与竞争假设排除；
  - **综述与对比**：对比不同学派路线、材料体系、共识分歧与未来趋势。
- **模板与预设随备份漫游**：采用全新的 `schemaVersion: 2` 备份体系，用户自定义的研读预设（Research Presets）将随全量工作区备份自动打包，并在新设备恢复时智能合并；
- **版本门禁安全机制**：内置严格的主版本门禁，安全拦截不兼容的高版本数据侵入，彻底保护本地研读资产免遭损坏。

---

<a id="settings"></a>

## ⚙️ 设置与使用

在 **Zotero → 设置 → Zotero MindFlow** 中可调优所有功能，界面清晰划分为三大常显卡片：

| 分组 | 核心设置项 | 说明与生效时机 |
|---|---|---|
| **文献与工作台** | 窗口呈现方式（Zotero 选项卡 / 独立窗口）<br>导图默认布局（思维导图 / 逻辑图 / 组织架构图）<br>节点连线风格（平滑贝塞尔曲线 / 圆角正交折线 / 极简直线）<br>画布背景模式（网格吸附 / 点阵 / 纯色背景）<br>主工具栏停靠位置（顶部 / 底部）<br>首次使用欢迎引导 | 决定导图是在 Zotero 原生标签页打开还是在新窗口弹出，自定义导图几何呈现与视觉张力；对新建导图及当前工作台即时生效。 |
| **AI 研究与数据保存** | 自动提取文献摘要与元数据<br>默认学术研读框架预设（8 套内置模板选择）<br>自动快照保存时间间隔（1 ~ 120 分钟）<br>单篇导图最大快照保留数（10 ~ 50 份）<br>工作区全量备份导出 / 导入恢复<br>WebDAV 远端备份端点与凭据<br>`llm-for-zotero` 本地 AI 运行时联动 | 控制从文献条目抽取节点时的精细度，配置强类型安全备份与快照自动保存，配置标准 HTTPS WebDAV 远端存储与本地 AI 模型调用。 |
| **导图编辑与快捷键** | 节点双击/Space 编辑、Tab 插入子节点、Enter 插入同级、Shift+Enter 上方插入<br>Delete/Backspace 删除、Ctrl+S 立即归档、Ctrl+F 搜索、Ctrl+Z/Y 撤销重做<br>F5/Alt+P 演示模式、Ctrl+1 适应画布、? 快捷键指南 | 在工作台与设置面板中随时查阅全键盘操作规范；快捷键开箱即用，无缝融入沉浸式研读录入。 |

---

<a id="data"></a>

## 🔒 数据、同步与外部服务

- **工作区本地落盘**：导图实时保存在 Zotero 本地数据目录的 `mindflow/workspace` 中，采用原子化防写坏机制；本地保存成功表示本地工作区落盘，点击“归档”方可生成附件。
- **Zotero 附件归档**：归档后的 `.mindflow` 文件作为子附件依附于目标文献条目，随 Zotero 原生附件同步机制（如 Zotero Storage 或 WebDAV）跨设备自动漫游。
- **备份与隐私安全性**：
  - 本插件绝不向任何未经授权的第三方服务器上传您的文献、导图或隐私数据；
  - AI 研读功能完全基于本地的 `llm-for-zotero` 运行时，数据流向完全取决于您在该插件中配置的端点，MindFlow 本身零凭据存储、零外链上报。

---

<a id="compatibility"></a>

## 🧪 兼容性与验证范围

| 指标 | 规范声明与实际验证 |
|---|---|
| **当前发布版本** | **v13.0.3** (Patch Release) |
| **清单兼容声明范围** | Zotero `10.0` 至 `12.*` (`strict_min_version: 10.0`, `strict_max_version: 12.*`) |
| **静态类型检查** | `npm run typecheck`（TypeScript 编译通过，**0** 错误） |
| **前端核心单元测试** | `npm test`（**111 / 111** 项全数通过：45 项数据链 + 36 项核心逻辑 + 7 项预设 + 23 项数据完整性） |
| **Zotero 宿主行为回归** | `node --test scripts/test-host.mjs`（**89 / 89** 项全数通过） |
| **发布包与更新源自检** | `python scripts/test-release-package.py`（**8 / 8** 项通过，哈希与更新源完全匹配） |

---

<a id="troubleshooting"></a>

## ❓ 常见问题

<details>
<summary><b>1. 为什么编辑了导图，在 Zotero 条目下看不到 <code>.mindflow</code> 附件？</b></summary>

> MindFlow 采用“本地实时编辑工作区”与“文献条目归档”两级存储设计：  
> - 编辑时系统每隔数秒会自动保存至本地工作区缓存，防止突发闪退丢失；  
> - 当需要将当前导图永久保存为文献子附件随库漫游时，请点击工作台工具栏上的 **归档到 Zotero**（或按下 `Ctrl + S`）。归档成功后，条目树下即会出现专有附件。
</details>

<details>
<summary><b>2. 导图窗口显示空白或提示数据加载异常怎么办？</b></summary>

> - 请检查是否使用了未来更高版本的备份文件（v13.0.0 内置了主版本门禁保护，拒绝高于 v13 的非兼容数据以保护本地库）；  
> - 可以在设置界面的“AI 研究与数据保存”中，选择此前的历史快照执行一键恢复，或通过工作区备份恢复找回最近一次完整数据。
</details>

<details>
<summary><b>3. AI 智能研读草稿按钮点击后没有反应？</b></summary>

> - MindFlow 不直接连接云端模型，而是借用生态组件 `llm-for-zotero`；  
> - 请确保已在 Zotero 中正确安装并配置好 `llm-for-zotero` 插件且模型可用；  
> - 检查当前选中的文献是否具备有效摘要或可提取文本的 PDF 附件。
</details>

---

<a id="development"></a>

## 💻 开发与详细文档

普通学术用户安装 XPI 即可直接使用，无需任何开发环境。如需参与二次开发或本地构建：

```powershell
# 1. 安装前端依赖
npm ci --prefix source

# 2. 运行 TypeScript 类型检查与前端单元测试
npm run typecheck --prefix source
npm test --prefix source

# 3. 执行本地生产构建
npm run build --prefix source

# 4. 运行 Zotero 宿主行为回归测试与发布包校验
node --test scripts/test-host.mjs
python scripts/test-release-package.py

# 5. 打包 XPI 并验证更新源
python scripts/package-xpi.py --update-feeds
python scripts/package-xpi.py --verify-only
```

- [审查文档索引 / Audit documentation](docs/README.md)
- [最新版本说明 / Release notes v13.0.3](docs/releases/v13.0.3.md)
- [产品品牌定位 / Brand specifications](docs/brand/PRODUCT.md)
- [发布标签与版本策略 / Release tag policy](docs/release-tag-policy.md)
- [原详细功能指南与致谢 · Reference](docs/reference/README.md)

---

<a id="series"></a>

## 🔗 系列产品

**Zotero Flow Series** 系列工具矩阵，助力学术全流程一体化连接：

| 产品 | 定位与核心职责 |
|---|---|
| [Zotero RefFlow](https://github.com/groele/Zotero-RefFlow) | **文献发现** · 跨源检索参考文献、被引文献、关联网络与智能导入。 |
| [Zotero MetaFlow](https://github.com/groele/Zotero-MetaFlow) | **元数据整理** · 校验、规范、清洗并智能补全学术文献元数据。 |
| [Zotero ViewFlow](https://github.com/groele/Zotero-ViewFlow) | **阅读预览** · 在 Zotero 侧栏快速预览文献全貌并复制标准引文。 |
| **Zotero MindFlow** | **知识组织** · 将文献、批注与学术思路组织为自由可编辑导图。 |
| [Zotero TaskFlow](https://github.com/groele/Zotero-TaskFlow) | **任务推进** · 将文献研读与学术写作转化为清晰可追踪的里程碑。 |
| [Zotero CiteFlow](https://github.com/groele/Zotero-CiteFlow) | **写作引用** · 智能追踪 Word 文档引用，深度连接文献上下文。 |
| [Zotero PaperFlow](https://github.com/groele/Zotero-PaperFlow) | **投稿审稿** · 全流程管理学术手稿、投稿轮次追踪与审稿意见回复。 |

*注：各插件保持独立轻量安装与升级；同属一个系列并不强制捆绑安装，各自专注于独立的科研流转环节。*

---

<a id="license"></a>

## 📄 项目来源与许可

- **开发来源声明**：本插件作为独立维护的 Zotero Flow 生态组件发布，未基于任何单一第三方 Zotero 导图插件进行二次分支包装。`llm-for-zotero` 为可选的外部运行时环境，非本插件的源代码派生来源。
- **开源许可证**：遵循 [MIT License](LICENSE) 协议发布。
- **免责与商标声明**：本系列为开源社区独立项目，并非 Corporation for Digital Scholarship 或 Zotero 官方团队所开发的产品。Zotero 名称与商标归各自权利人所有。
