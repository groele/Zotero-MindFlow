/**
 * Zotero MindFlow - declarative settings-pane field catalogue.
 * Kept apart from the controller so the data table stays reviewable.
 */
import { T, THEMES } from './preferenceSchema';
import type { PreferenceField } from './preferenceSchema';

export const FIELDS: Record<string, PreferenceField[]> = {
  literature: [
    {
      path: 'zoteroWindowMode',
      title: T('打开方式', 'Open Mode'),
      desc: T('从文献条目或 PDF 阅读器打开导图时的窗口呈现模式', 'Window presentation mode when opening maps from items or the PDF reader'),
      type: 'select',
      options: [['tab', T('Zotero 选项卡 (推荐)', 'Zotero Tab (Recommended)')], ['window', T('独立窗口', 'Standalone Window')]],
    },
    {
      path: 'showWelcomeOnStartup',
      title: T('打开空白工作台时显示欢迎页', 'Show welcome page on blank workspace'),
      desc: T('展示模板库、知识图谱向导与快速开始帮助', 'Display template library, knowledge graph guide, and quick start help'),
      type: 'check',
    },
    {
      path: 'zoteroIncludeAbstract',
      title: T('从文献条目导入摘要', 'Import abstract from literature item'),
      desc: T('一键生成导图时将文献 Abstract 作为专属子分支导入', 'Include the item Abstract as a dedicated branch when generating a map'),
      type: 'check',
    },
    {
      path: 'zoteroIncludeAnnotations',
      title: T('导入 PDF 划线高亮与批注笔记', 'Import PDF highlights and annotations'),
      desc: T('自动提取关联 PDF 的批注、划线和文本备注并结构化建树', 'Automatically extract PDF highlights, annotations, and notes into structured branches'),
      type: 'check',
    },
    {
      path: 'zoteroIncludeTags',
      title: T('导入文献标签 (Tags)', 'Import item tags'),
      desc: T('将文献已有标签呈现为思维导图分支标签', 'Present existing item tags as mind map branch tags'),
      type: 'check',
    },
    {
      path: 'autoArchiveToItem',
      title: T('归档导图附件时自动更新大纲子笔记', 'Auto-update outline child note on map archive'),
      desc: T('在文献条目下同步维护一份纯文本结构化 Markdown/大纲笔记', 'Maintain a structured Markdown/outline child note under the literature item'),
      type: 'check',
      native: true,
    },
    {
      path: 'autoOpenAfterExport',
      title: T('保存为 Zotero 笔记后在文献库中聚焦定位', 'Locate note in library after exporting'),
      desc: T('导出笔记后自动返回文献库列表并高亮新生成的笔记条目', 'Automatically focus and highlight the newly exported note in the library'),
      type: 'check',
      native: true,
    },
  ],
  ai: [
    {
      path: 'aiMaxPdfPages',
      title: T('最多读取 PDF 页数', 'Maximum PDF pages to analyze'),
      desc: T('长篇文献分析时的页数截断保护，防止模型上下文溢出或请求超时', 'Page cutoff limit for long papers to prevent context window overflow or timeouts'),
      type: 'number-select',
      options: [['50', T('前 50 页', 'First 50 pages')], ['120', T('前 120 页 (推荐)', 'First 120 pages (Recommended)')], ['200', T('前 200 页', 'First 200 pages')]],
      native: true,
    },
  ],
  interface: [
    { path: 'toolbarTemplatesPlacement', title: T('模板入口位置', 'Templates Entry Placement'), desc: T('选择固定展示、收纳到更多或隐藏入口；功能本身不被禁用', 'Keep visible on toolbar, tuck into More menu, or hide from top bar'), type: 'select', options: [['toolbar', T('工具栏', 'Toolbar')], ['more', T('更多（推荐）', 'More Menu (Recommended)')], ['hidden', T('隐藏', 'Hidden')]] },
    { path: 'toolbarPresentationPlacement', title: T('演示入口位置', 'Presentation Entry Placement'), desc: T('选择固定展示、收纳到更多或隐藏入口；功能本身不被禁用', 'Keep visible on toolbar, tuck into More menu, or hide from top bar'), type: 'select', options: [['toolbar', T('工具栏', 'Toolbar')], ['more', T('更多（推荐）', 'More Menu (Recommended)')], ['hidden', T('隐藏', 'Hidden')]] },
    { path: 'toolbarExportPlacement', title: T('导入与导出入口位置', 'Import/Export Entry Placement'), desc: T('选择固定展示、收纳到更多或隐藏入口；功能本身不被禁用', 'Keep visible on toolbar, tuck into More menu, or hide from top bar'), type: 'select', options: [['toolbar', T('工具栏', 'Toolbar')], ['more', T('更多（推荐）', 'More Menu (Recommended)')], ['hidden', T('隐藏', 'Hidden')]] },
    {
      path: 'toolbarPosition',
      title: T('主工具栏位置', 'Main Toolbar Placement'),
      desc: T('工作台画布顶层控制栏的停靠方向', 'Docking direction of the top toolbar in the workspace'),
      type: 'select',
      options: [['top', T('画布顶部 (推荐)', 'Top Canvas (Recommended)')], ['bottom', T('画布底部', 'Bottom Canvas')]],
    },
    {
      path: 'workbenchDockPosition',
      title: T('工作台侧栏位置', 'Sidebar Dock Position'),
      desc: T('大纲与辅助面板停靠在工作台的左侧或右侧', 'Outline and auxiliary panels dock to the left or right of the canvas'),
      type: 'select',
      options: [['left', T('居左 (默认)', 'Left (Default)')], ['right', T('居右', 'Right')]],
    },
    {
      path: 'canvasBackground',
      title: T('画布背景网格', 'Canvas Background Grid'),
      desc: T('思维导图画布的背景图案与视觉底纹风格', 'Background pattern and texture of the mind map canvas'),
      type: 'select',
      options: [['dots', T('点阵 (Dots)', 'Dots')], ['grid', T('网格 (Grid)', 'Grid')], ['blank', T('纯白空白 (Blank)', 'Solid Blank')]],
    },
    {
      path: 'zoomStep',
      title: T('鼠标滚轮缩放步进', 'Scroll Wheel Zoom Step'),
      desc: T('每次转动滚轮时画布缩放比例的变化幅度', 'Change rate of canvas zoom scale per wheel step'),
      type: 'number-select',
      options: [['0.1', T('10% (细腻)', '10% (Fine)')], ['0.15', T('15% (标准)', '15% (Standard)')], ['0.2', T('20% (快速)', '20% (Fast)')], ['0.3', T('30% (大幅)', '30% (Large)')]],
    },
    {
      subhead: T('工作台顶栏常用按钮显示', 'Workspace Toolbar Quick Buttons'),
    },
    {
      path: 'toolbarButtons.history',
      title: T('撤销与重做', 'Undo & Redo'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.insert',
      title: T('插入节点', 'Insert Node'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.layout',
      title: T('结构布局', 'Layout Structures'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.theme',
      title: T('主题配色', 'Color Themes'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.outline',
      title: T('大纲视图', 'Outline View'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.inbox',
      title: T('灵感收集箱', 'Inspiration Inbox'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.templates',
      title: T('预设模板', 'Preset Templates'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.zen',
      title: T('全屏专注', 'Zen Mode'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.export',
      title: T('导出与归档', 'Export & Archive'),
      type: 'check',
      inGrid: true,
    },
    {
      path: 'toolbarButtons.zoom',
      title: T('画布缩放', 'Canvas Zoom'),
      type: 'check',
      inGrid: true,
    },
  ],
  editing: [
    {
      path: 'defaultThemeId',
      title: T('新建导图默认主题', 'Default Map Theme'),
      desc: T('新建空白思维导图时应用的默认调色盘', 'Default palette applied when creating a new blank mind map'),
      type: 'select',
      options: THEMES,
    },
    {
      path: 'defaultLayout',
      title: T('新建导图默认布局', 'Default Map Layout'),
      desc: T('新建思维导图时节点生长的默认分支排布规则', 'Default branching rule for new mind map nodes'),
      type: 'select',
      options: [
        ['mindmap', T('经典左右平衡 (Mindmap)', 'Standard Mind Map (Radial)')],
        ['logic-right', T('向右逻辑图 (Logic Right)', 'Left-to-Right Logical Tree')],
        ['org-down', T('向下组织架构图 (Org Down)', 'Top-to-Bottom Org Chart')],
      ],
    },
    {
      path: 'curveStyle',
      title: T('分支连线风格', 'Branch Line Style'),
      desc: T('父子节点之间连接线条的几何渲染形式', 'Geometric curve rendering between parent and child nodes'),
      type: 'select',
      options: [['bezier', T('平滑贝塞尔曲线', 'Smooth Bezier Curve')], ['straight', T('直线', 'Straight Line')], ['rounded', T('圆角折线', 'Rounded Polyline')]],
    },
    {
      path: 'rainbowBranches',
      title: T('为主分支自动分配彩虹色彩', 'Auto-assign rainbow colors to branches'),
      desc: T('根节点下的每个一级子分支自动轮换不同色彩，清晰辨识知识分支', 'Distribute distinct colors to each top-level branch for clearer distinction'),
      type: 'check',
    },
    {
      path: 'soundEffects',
      title: T('播放节点操作微交互音效', 'Play interaction sound effects'),
      desc: T('在插入、删除节点或拖拽重排时播放轻微的声音反馈', 'Play gentle audio feedback when inserting, deleting, or reordering nodes'),
      type: 'check',
    },
    {
      path: 'autoExpandOnAddChild',
      title: T('添加子节点时自动展开父节点', 'Auto-expand parent node on adding child'),
      desc: T('向折叠节点添加新子节点时，自动展开该父分支', 'Automatically expand a collapsed parent branch when adding a child node'),
      type: 'check',
    },
  ],
  backup: [
    {
      path: 'customSavePath',
      title: T('额外镜像备份目录', 'Extra Mirror Backup Folder'),
      desc: T('除文献附件库外，每次保存可额外备份一份 .mindflow 副本至指定本地文件夹（留空则不开启）', 'Save an additional .mindflow copy to a local directory alongside item attachments'),
      type: 'text',
      native: true,
    },
    {
      path: 'autoSnapshotEnabled',
      title: T('编辑时自动创建历史快照', 'Automatically create history snapshots'),
      desc: T('防止误操作或内容丢失，工作台在后台静默保存带有时间戳的历史版本', 'Silently save timestamped versions in the background to prevent data loss'),
      type: 'check',
    },
    {
      path: 'autoSnapshotIntervalMinutes',
      title: T('快照保存频率', 'Snapshot Interval'),
      desc: T('后台自动记录编辑快照的最小时间间隔', 'Minimum time interval for automatic background snapshots'),
      type: 'number-select',
      options: [['5', T('每 5 分钟', 'Every 5 minutes')], ['10', T('每 10 分钟 (推荐)', 'Every 10 minutes (Recommended)')], ['15', T('每 15 分钟', 'Every 15 minutes')], ['30', T('每 30 分钟', 'Every 30 minutes')]],
    },
    {
      path: 'maxSnapshotsPerDoc',
      title: T('每份导图最多保留快照数', 'Max Snapshots per Map'),
      desc: T('超出限制后将自动丢弃最早的快照以释放本地存储空间', 'Oldest snapshots are automatically pruned when the limit is reached'),
      type: 'number-select',
      options: [['10', T('10 个快照', '10 snapshots')], ['20', T('20 个快照 (推荐)', '20 snapshots (Recommended)')], ['50', T('50 个快照', '50 snapshots')]],
    },
  ],
  webdav: [
    {
      path: 'webdav.enabled',
      title: T('启用 WebDAV 云端备份', 'Enable WebDAV Cloud Backup'),
      desc: T('使用坚果云、Nextcloud 等标准 WebDAV 服务端同步导图工作区备份', 'Sync workspace backups with standard WebDAV servers like Nutstore or Nextcloud'),
      type: 'check',
    },
    {
      path: 'webdav.serverUrl',
      title: T('服务器 URL 地址', 'Server URL'),
      desc: T('必须使用 HTTPS，如 https://dav.jianguoyun.com/dav/', 'Must use HTTPS, e.g. https://dav.jianguoyun.com/dav/'),
      type: 'url',
    },
    {
      path: 'webdav.basePath',
      title: T('云端同步目录', 'Cloud Backup Directory'),
      desc: T('存储备份的根目录，默认为 /MindFlow/', 'Root folder path for storing backups, defaults to /MindFlow/'),
      type: 'text',
    },
    {
      path: 'webdav.username',
      title: T('账户用户名 / 邮箱', 'Username / Email'),
      desc: T('WebDAV 登录用户名', 'WebDAV login account username'),
      type: 'text',
    },
    {
      path: 'webdav.password',
      title: T('应用授权密码 / Token', 'Application Password / Token'),
      desc: T('强烈建议使用云盘提供的应用独立密码或安全令牌', 'Using an app-specific password or token is strongly recommended'),
      type: 'password',
    },
    {
      path: 'webdav.autoSyncOnSave',
      title: T('本地保存时自动推送云端备份', 'Push cloud backup on local save'),
      desc: T('每次在工作台保存导图时，静默上传工作区增量备份', 'Silently upload workspace incremental backup on each manual save'),
      type: 'check',
    },
  ],
};

