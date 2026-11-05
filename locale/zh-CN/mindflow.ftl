mindflow-menu-open = Zotero MindFlow 思维导图
mindflow-item-menu-create = 在 MindFlow 中生成思维导图
mindflow-item-menu-add = 添加到当前 MindFlow 导图
mindflow-collection-menu-create = 生成此分类思维导图
mindflow-toolbar-tooltip = 打开 Zotero MindFlow 思维导图工作区
mindflow-reader-send = 发送摘录至 MindFlow 导图
# 此消息应用到整个原生 collapsible-section。仅设置属性，以保留标题和正文控件。
mindflow-item-pane-header =
    .label = MindFlow 导图
    .tooltiptext = MindFlow 思维导图与文献研读
mindflow-item-pane-sidenav =
    .title = 打开 MindFlow 导图
    .aria-label = MindFlow 导图
    .tooltiptext = 打开 MindFlow 导图
mindflow-item-pane-count =
    { $count ->
        [0] 这篇文献还没有 MindFlow 导图
       *[other] 已有 { $count } 份 MindFlow 导图
    }
mindflow-item-pane-empty-selection = 当前没有选中的文献，可直接新建空白导图。
mindflow-item-pane-current-item = 当前文献
mindflow-item-pane-no-map = 暂无关联导图
mindflow-item-pane-choose-template-hint = 先选择模板，再创建这篇文献的导图。
mindflow-item-pane-add-from-template = 按模板新增
mindflow-item-pane-generate-map = 生成导图
mindflow-item-pane-pdf-ready = PDF 就绪
mindflow-item-pane-pdf-missing = 无 PDF
mindflow-item-pane-template-label = 导图模板
mindflow-item-pane-template-select =
    .aria-label = 导图模板
mindflow-item-pane-action-ai = AI 论文精读
mindflow-item-pane-action-companion = 伴读窗口
mindflow-item-pane-action-import = 导入导图
mindflow-item-pane-action-blank = 独立空白导图
mindflow-item-pane-action-pdf = 打开 PDF
mindflow-item-pane-pdf-open-failed = 无法打开 PDF，请检查附件是否已下载。
mindflow-item-pane-action-workbench = 导图工作台
    .title = 进入 MindFlow 总工作台，查看和管理已有导图
mindflow-item-pane-card-open = 打开
mindflow-item-pane-card-export = 导出大纲
mindflow-item-pane-card-locate = 定位附件
mindflow-item-pane-open =
    .title = 打开导图：{ $title }
mindflow-item-pane-open-button = 打开
mindflow-item-pane-create = 新建思维导图
    .title = 为当前文献新建一份思维导图
mindflow-item-pane-create-another = 新增思维导图
    .title = 为当前文献再添加一份思维导图
mindflow-item-pane-create-local = 创建本地导图（文献库只读）
    .title = 在本地创建独立导图副本
mindflow-item-pane-create-blank = 新建空白思维导图
    .title = 创建一份独立的空白思维导图
mindflow-item-pane-workspace-title = MindFlow 工作台
mindflow-item-pane-actions =
    .aria-label = MindFlow 便捷操作
mindflow-item-pane-ai = AI 论文导图
    .title = 为当前文献打开 AI 分析面板，选择模型与阅读范围
mindflow-item-pane-workspace = 打开工作台
    .title = 打开 MindFlow 工作台
mindflow-item-pane-import = 导入导图
    .title = 导入 MindFlow、JSON、Markdown 或 OPML 文件
mindflow-item-pane-pdf = 打开 PDF
    .title = 打开当前文献的 PDF 附件
mindflow-item-pane-blank = 独立空白导图
    .title = 新建不关联当前文献的空白导图
mindflow-item-pane-refresh = 刷新
    .title = 刷新当前文献的导图列表
mindflow-item-pane-list-title = 当前文献导图
mindflow-item-pane-list-empty = 新建导图后，可在这里快速打开。
mindflow-item-pane-action-failed = 操作失败，请重试。
mindflow-item-pane-linked-maps-title = 已关联导图
mindflow-item-pane-quick-create-title = 快速新建导图
mindflow-item-pane-template-create = 按所选模板生成导图
mindflow-item-pane-readonly-badge = 只读文献
mindflow-item-pane-readonly-hint = 当前文献为只读（或在回收站中），导图仅保存在本地工作区，不会写入附件。

## Preferences
mindflow-pref-title = Zotero MindFlow
mindflow-pref-status-checking = 正在加载设置项…
mindflow-pref-btn-open-workspace = 打开导图工作台

mindflow-pref-group-workspace = 文献与工作台
mindflow-pref-subhead-interface = 工作台界面与工具栏
mindflow-pref-group-ai-sync = AI 研究与数据保存
mindflow-pref-subhead-backup = 本地保存与历史快照
mindflow-pref-subhead-webdav = WebDAV 同步
mindflow-pref-group-editing-shortcuts = 导图编辑与快捷键
mindflow-pref-subhead-shortcuts = 快捷键与系统重置

mindflow-pref-shortcut-child = 添加子节点
mindflow-pref-shortcut-sibling = 添加同级节点
mindflow-pref-shortcut-edit = 编辑节点文本（或双击）
mindflow-pref-shortcut-delete = 删除选定节点
mindflow-pref-shortcut-toggle = 折叠 / 展开当前分支
mindflow-pref-shortcut-levels = 展开至 1~3 级分支（Alt+0 展开全部）
mindflow-pref-shortcut-replace = 全局即时搜索与替换
mindflow-pref-shortcut-help = 呼出全键盘快捷操作指南

mindflow-pref-reset-label = 恢复默认设置
mindflow-pref-reset-desc = 仅重置插件偏好设置，不会删除导图附件、文献条目或历史快照
mindflow-pref-reset-btn = 恢复 MindFlow 默认设置

mindflow-pref-release-section-title = 版本信息
mindflow-pref-release-notes-label = 版本说明
mindflow-pref-release-date-label = 构建日期
mindflow-pref-release-current-label = 当前版本
mindflow-pref-release-repo-label = 项目仓库

# 动态设置项
mindflow-pref-zoteroWindowMode = 打开方式
mindflow-pref-zoteroWindowMode-desc = 从文献条目或 PDF 阅读器打开导图时的窗口呈现模式
mindflow-pref-showWelcomeOnStartup = 打开空白工作台时显示欢迎页
mindflow-pref-showWelcomeOnStartup-desc = 展示模板库、知识图谱向导与快速开始帮助
mindflow-pref-zoteroIncludeAbstract = 从文献条目导入摘要
mindflow-pref-zoteroIncludeAbstract-desc = 一键生成导图时将文献 Abstract 作为专属子分支导入
mindflow-pref-zoteroIncludeAnnotations = 导入 PDF 划线高亮与批注笔记
mindflow-pref-zoteroIncludeAnnotations-desc = 自动提取关联 PDF 的批注、划线和文本备注并结构化建树
mindflow-pref-zoteroIncludeTags = 导入文献标签 (Tags)
mindflow-pref-zoteroIncludeTags-desc = 将文献已有标签呈现为思维导图分支标签
mindflow-pref-autoArchiveToItem = 归档导图附件时自动更新大纲子笔记
mindflow-pref-autoArchiveToItem-desc = 在文献条目下同步维护一份纯文本结构化 Markdown/大纲笔记
mindflow-pref-autoOpenAfterExport = 保存为 Zotero 笔记后在文献库中聚焦定位
mindflow-pref-autoOpenAfterExport-desc = 导出笔记后自动返回文献库列表并高亮新生成的笔记条目

mindflow-pref-aiMaxPdfPages = 最多读取 PDF 页数
mindflow-pref-aiMaxPdfPages-desc = 长篇文献分析时的页数截断保护，防止模型上下文溢出或请求超时

mindflow-pref-toolbarTemplatesPlacement = 模板入口位置
mindflow-pref-toolbarTemplatesPlacement-desc = 选择固定展示、收纳到更多或隐藏入口；功能本身不被禁用
mindflow-pref-toolbarPresentationPlacement = 演示入口位置
mindflow-pref-toolbarPresentationPlacement-desc = 选择固定展示、收纳到更多或隐藏入口；功能本身不被禁用
mindflow-pref-toolbarExportPlacement = 导入与导出入口位置
mindflow-pref-toolbarExportPlacement-desc = 选择固定展示、收纳到更多或隐藏入口；功能本身不被禁用
mindflow-pref-toolbarPosition = 主工具栏位置
mindflow-pref-toolbarPosition-desc = 工作台画布顶层控制栏的停靠方向
mindflow-pref-workbenchDockPosition = 工作台侧栏位置
mindflow-pref-workbenchDockPosition-desc = 大纲与辅助面板停靠在工作台的左侧或右侧
mindflow-pref-canvasBackground = 画布背景网格
mindflow-pref-canvasBackground-desc = 思维导图画布的背景图案与视觉底纹风格
mindflow-pref-zoomStep = 鼠标滚轮缩放步进
mindflow-pref-zoomStep-desc = 每次转动滚轮时画布缩放比例的变化幅度

mindflow-pref-subhead-toolbar-buttons = 工作台顶栏常用按钮显示
mindflow-pref-toolbarButtons-history = 撤销与重做
mindflow-pref-toolbarButtons-insert = 插入节点
mindflow-pref-toolbarButtons-layout = 结构布局
mindflow-pref-toolbarButtons-theme = 主题配色
mindflow-pref-toolbarButtons-outline = 大纲视图
mindflow-pref-toolbarButtons-inbox = 灵感收集箱
mindflow-pref-toolbarButtons-templates = 预设模板
mindflow-pref-toolbarButtons-zen = 全屏专注
mindflow-pref-toolbarButtons-export = 导出与归档
mindflow-pref-toolbarButtons-zoom = 画布缩放

mindflow-pref-defaultThemeId = 新建导图默认主题
mindflow-pref-defaultThemeId-desc = 新建空白思维导图时应用的默认调色盘
mindflow-pref-defaultLayout = 新建导图默认布局
mindflow-pref-defaultLayout-desc = 新建思维导图时节点生长的默认分支排布规则
mindflow-pref-curveStyle = 分支连线风格
mindflow-pref-curveStyle-desc = 父子节点之间连接线条的几何渲染形式
mindflow-pref-rainbowBranches = 为主分支自动分配彩虹色彩
mindflow-pref-rainbowBranches-desc = 根节点下的每个一级子分支自动轮换不同色彩，清晰辨识知识分支
mindflow-pref-soundEffects = 播放节点操作微交互音效
mindflow-pref-soundEffects-desc = 在插入、删除节点或拖拽重排时播放轻微的声音反馈
mindflow-pref-autoExpandOnAddChild = 添加子节点时自动展开父节点
mindflow-pref-autoExpandOnAddChild-desc = 向折叠节点添加新子节点时，自动展开该父分支

mindflow-pref-customSavePath = 额外镜像备份目录
mindflow-pref-customSavePath-desc = 除文献附件库外，每次保存可额外备份一份 .mindflow 副本至指定本地文件夹（留空则不开启）
mindflow-pref-autoSnapshotEnabled = 编辑时自动创建历史快照
mindflow-pref-autoSnapshotEnabled-desc = 防止误操作或内容丢失，工作台在后台静默保存带有时间戳的历史版本
mindflow-pref-autoSnapshotIntervalMinutes = 快照保存频率
mindflow-pref-autoSnapshotIntervalMinutes-desc = 后台自动记录编辑快照的最小时间间隔
mindflow-pref-maxSnapshotsPerDoc = 每份导图最多保留快照数
mindflow-pref-maxSnapshotsPerDoc-desc = 超出限制后将自动丢弃最早的快照以释放本地存储空间

mindflow-pref-webdav-enabled = 启用 WebDAV 云端备份
mindflow-pref-webdav-enabled-desc = 使用坚果云、Nextcloud 等标准 WebDAV 服务端同步导图工作区备份
mindflow-pref-webdav-serverUrl = 服务器 URL 地址
mindflow-pref-webdav-serverUrl-desc = 必须使用 HTTPS，如 https://dav.jianguoyun.com/dav/
mindflow-pref-webdav-basePath = 云端同步目录
mindflow-pref-webdav-basePath-desc = 存储备份的根目录，默认为 /MindFlow/
mindflow-pref-webdav-username = 账户用户名 / 邮箱
mindflow-pref-webdav-username-desc = WebDAV 登录用户名
mindflow-pref-webdav-password = 应用授权密码 / Token
mindflow-pref-webdav-password-desc = 强烈建议使用云盘提供的应用独立密码或安全令牌
mindflow-pref-webdav-autoSyncOnSave = 本地保存时自动推送云端备份
mindflow-pref-webdav-autoSyncOnSave-desc = 每次在工作台保存导图时，静默上传工作区增量备份


mindflow-pref-version = v{ $version }
mindflow-pref-release-notes-text = 13.2.1：修复关系线导图保存，完善关闭保存、只读防护与侧栏展开
mindflow-pref-release-date = 2026-11-05
mindflow-pref-release-xpi = zotero-mindflow-13.2.1.xpi
mindflow-pref-release-repo = github.com/groele/Zotero-MindFlow
mindflow-pref-release-aria = 版本信息
mindflow-pref-notice-backup = 提示：额外保存文件夹不代替文献条目下的 .mindflow 附件。历史快照与完整版本回溯可在导图工作台顶栏的「历史」面板中直接浏览与一键恢复。
mindflow-pref-notice-webdav = 提示：WebDAV 作为独立于 Zotero 原生同步的工作区级二次容灾备份。连接测试、手动上传和版本恢复请在工作台操作。
mindflow-pref-btn-choose-folder = 选择文件夹
mindflow-pref-btn-toggle-token = 显示 / 隐藏密钥
mindflow-pref-btn-open-llm = 打开 llm-for-zotero 设置
mindflow-pref-status-loaded = 设置已就绪
mindflow-pref-status-saved = 设置已保存
mindflow-pref-status-reset = 已恢复默认设置
mindflow-pref-notice-literature = 提示：导图源文件 (.mindflow) 自动作为附件归档在对应文献条目下；跨设备同步遵从 Zotero 文件同步策略。

mindflow-pref-key-0 = Tab
mindflow-pref-key-1 = Enter
mindflow-pref-key-2 = Space / F2
mindflow-pref-key-3 = Delete / Backspace
mindflow-pref-key-4 = /
mindflow-pref-key-5 = Alt + 1~3
mindflow-pref-key-6 = Ctrl + H
mindflow-pref-key-7 = ?
