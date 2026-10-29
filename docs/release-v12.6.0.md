# Zotero MindFlow 12.6.0

## 工具栏与界面

- 模板、演示、导入导出默认收纳到“更多”。在 Zotero MindFlow 设置的“工作台界面与工具栏”中，可分别选择“工具栏 / 更多 / 隐藏”；独立窗口内的设置也提供同样选择。已有功能开关继续生效。
- 常用编辑操作保持在工具区前部，其他控件在窄窗自然换行。“更多”直接提供导出格式与导入入口。
- 工具栏弹层互斥，支持外部点击关闭、Esc/Tab 退出、方向键导航和焦点恢复；根据可用窗口空间定位。Windows 快捷键提示使用 Ctrl，macOS 使用 ⌘。
- 使用浅蓝与淡青区分功能，减轻侧栏和菜单阴影；缩小色板色块并保留点击区域。工作台暗色样式与文档主题一致。
- 保留前几轮原生键盘保护、右键菜单导航、焦点与窄窗定位修复。

## 数据与兼容性

设置为向后兼容的新增字段；已有隐藏开关不会被覆盖。插件 ID、导图格式与 Zotero 10.0.x 兼容声明保持原样。隐藏的是入口，不禁用命令或删除数据。

## 验证

前端数据链 45 项、逻辑 32 项、研究预设 7 项、恢复/完整性测试、85 项宿主模拟、类型检查、生产构建、工具栏与右键菜单的真实 React/Chromium 回归、发布包自测和 61 个运行时资源/双更新源校验通过。

Windows Zotero 10.0.6 隔离原生回归 48/48、新进程重启恢复 3/3 通过，包括三项入口设置在编辑器中实时刷新的检查。主 profile 安装、自动更新实机演练、完整主题/系统缩放视觉验收、其他系统与在线 AI/WebDAV 服务未在本轮验证。

XPI SHA-256：`b5da3f77330fca190b03b6bd81b0bfc793ec16127813cfb3527b7607cb9b0167`。

## English

Templates, presentation, and import/export now default to More. Configure each entry as Toolbar, More, or Hidden in preferences; existing visibility switches are preserved. Toolbar popups share keyboard navigation, focus return, dismissal, and viewport positioning. This release also includes the preceding native keyboard, context-menu, light-color, and theme-consistency improvements. Zotero 10.0.x compatibility and map data format are unchanged.
